# Kiểm chứng Phase4

- `npm run verify`: bộ test cácphase cònhiệulực, scenarios, determinism và headless đủ3đêm; tests.txt/verification.json và bộinput/output đi kèm.
- `npm run bench -- --seed 42 --duration 30 --out bench.json`: mở Chrome1280x720;3s warmup,30sđo. Kết quả ởgốcrepo bench.json, bench.scene.json xácnhận200shade/100mote/wander/3fuel100 và đo30000ms.
- `npm run soak -- --seed 7 --nights 10 --out soak.json`:10đêm cùngprocess, reset/GCđối xứng, RSSJITwarmupđượcghirõ. Điều kiệnfail được giữ, không chỉnh output.
- `node scripts/browser-phase4.mjs`: browser settings/rebind/conflict/reset/reload, chữ22.5px, reduce-motion, shade-direction, leaderboard/persistence/UIexport/CLIexport. Dùngdatafixturefile riêng, không sửa điểm thật của người dùng. Filebrowser.json và ảnhlà kếtquả thật.
- leaderboard-fixture.png và leaderboard*.json: scenario thua, kiểm tra tổngđêmthắng=0. Không phải bằng chứng chơi thắng3đêm.
- game.png: ghi hình gameplay thật. demo.json xácnhận H.264MP4 dưới5phút; demo-source.json nêu nguồnvideo. Đoạnreport trongvideo đọc từ kếtquả thật, không bịa.

Chưa chạy hidden tests, chưa đo trên máy giảngviên. RSSweb=null và vsync_off=false là giớihạn côngcụtrìnhduyệt được côngkhai, không phải sốđo giả. Hướngdẫn/giảđịnhchi tiết: docs/notes/phase-4.md vàdocs/retro.md.
