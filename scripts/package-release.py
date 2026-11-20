import json, subprocess, sys, zipfile, shutil, re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
release=root/'release';release.mkdir(exist_ok=True)
raw=json.loads((root/'docs/proof/phase-4/demo-source.json').read_text(encoding='utf-8'))['webm']
ffmpeg=shutil.which('ffmpeg')
if not ffmpeg:
    sys.path.insert(0,str(root/'.tools'))
    import imageio_ffmpeg
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
target=root/'docs/demo/demo.mp4'
subprocess.run([ffmpeg,'-y','-i',raw,'-c:v','libx264','-crf','28','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',str(target)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
probe=subprocess.run([ffmpeg,'-i',str(target)],capture_output=True,text=True)
match=re.search(r'Duration: (\d+):(\d+):([\d.]+)',probe.stderr)
seconds=int(match[1])*3600+int(match[2])*60+float(match[3])
if seconds>=300:raise SystemExit('Demo must be below five minutes')
(root/'docs/proof/phase-4/demo.json').write_text(json.dumps({'file':'docs/demo/demo.mp4','duration_s':seconds,'bytes':target.stat().st_size,'codec':'H.264/yuv420p','source':'Actual Playwright browser recording'},indent=2)+'\n',encoding='utf-8')
with zipfile.ZipFile(release/'dao-den-long-v1.0.0-web.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for file in (root/'dist').rglob('*'):
        if file.is_file():archive.write(file,file.relative_to(root/'dist'))
    for name in ['LICENSE','CREDITS.md']:archive.write(root/name,name)
    archive.writestr('RUN.txt','Dao Den Long v1.0.0 - static web build\nUnzip, then run: python3 -m http.server 8000\nWindows: python -m http.server 8000\nOpen http://localhost:8000 in Chrome with WebGL enabled.\nScores/settings persist in browser local storage. Export scores from menu.\nFor Node CLI, headless, benchmark and soak, use the source repository README.\n')
print(json.dumps({'demo_seconds':seconds,'demo_bytes':target.stat().st_size,'zip_bytes':(release/'dao-den-long-v1.0.0-web.zip').stat().st_size}))
