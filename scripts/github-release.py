"""Publish requested release using existing Git credentials, never print credentials."""
import json, os, re, subprocess, sys, urllib.request, urllib.error
from pathlib import Path
if os.name == 'nt':
    sys.path.insert(0,str(Path('.tools').resolve()))
    try:
        import truststore
        truststore.inject_into_ssl()
    except ImportError: pass
remote = subprocess.check_output(['git','remote','get-url','origin'], text=True).strip()
match = re.fullmatch(r'https://github.com/([^/]+)/([^/]+?)(?:\.git)?', remote)
if not match: raise SystemExit('Expected verified GitHub HTTPS origin')
repo = '/'.join(match.groups())
credential = subprocess.run(['git','-c','credential.interactive=never','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,env={**os.environ,'GIT_TERMINAL_PROMPT':'0'})
fields = dict(line.split('=',1) for line in credential.stdout.splitlines() if '=' in line)
token = fields.get('password')
if not token: raise SystemExit('GitHub authentication unavailable')
def request(path, data=None, method=None, content_type='application/json'):
    url=path if path.startswith('https://uploads.github.com/') else 'https://api.github.com'+path
    req=urllib.request.Request(url,data=data,method=method,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'DaoDenLongRelease','Content-Type':content_type})
    with urllib.request.urlopen(req,timeout=120) as response: return json.load(response)
if '--check' in sys.argv:
    info=request('/repos/'+repo)
    print(json.dumps({'repo':repo,'private':info['private'],'permissions':info.get('permissions',{})}))
    raise SystemExit(0)
try: release=request('/repos/'+repo+'/releases/tags/v1.0.0')
except urllib.error.HTTPError as error:
    if error.code!=404: raise
    commit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
    body=Path('release/RELEASE.md').read_text(encoding='utf-8')
    release=request('/repos/'+repo+'/releases',json.dumps({'tag_name':'v1.0.0','target_commitish':commit,'name':'Đảo Đèn Lồng v1.0.0','body':body,'draft':False,'prerelease':False}).encode(),method='POST')
existing={asset['name'] for asset in release['assets']}
for file,mime in [('release/dao-den-long-v1.0.0-web.zip','application/zip'),('docs/demo/demo.mp4','video/mp4'),('bench.json','application/json'),('soak.json','application/json')]:
    p=Path(file)
    if p.name in existing: continue
    request(release['upload_url'].split('{')[0]+'?name='+p.name,p.read_bytes(),method='POST',content_type=mime)
print(json.dumps({'release_url':release['html_url'],'tag':release['tag_name']},ensure_ascii=False))
