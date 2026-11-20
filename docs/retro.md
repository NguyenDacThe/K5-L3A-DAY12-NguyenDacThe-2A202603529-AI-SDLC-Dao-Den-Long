# Retro — Đảo Đèn Lồng qua bốn phase

## Kết quả và quá trình

Phase1 bắt đầu từ repo chỉ chứa tài liệu. Đọc PRD/Contract trước, chọn webThree.js + mô phỏng Node60Hz, dùng chunglogic để tránh lệch headless/UI. Bản đầu có đảo tròn, nhặt/nạp/pulse, thắng/thua và kiểm tra tất định. Điểm hữu ích nhất là thiết lập test hành vi trước khi làm đẹp.

Phase2 chuẩn hóa số và thêm3đêm. Bảng số/màu bị thiếu trong nội dung dán đầu tiên; hỏi đúng hai phần thiếu, vẫn xây module bản đồ/AI/bùa trong lúc chờ. Sau khi đủ yêu cầu mới tích hợp. Bot chơi thử cũ thua vì địch nhanh hơn; sửa bot biết dash/tránhđịch, không giảm sức mạnh địch để làmtest xanh. BrowserQA phát hiện cảm giác camera ngược; ảnh thật giúp sửa đúng.

Phase3 là đổi luật chứ không chỉ thêm tính năng. Dầu dùng đơn vị nguyên1/60, thêmdrain, chuyển thắngsớm sangdawn, capacity/score đổi. Các expectation cũ đổi kèm ghi chú và changelog; không skip âm thầm. Phần Phase3 đã được hoàn thiện/commit với Antigravity trước khi tiếp quản Phase4.

Phase4 tiếp quản khung Antigravity đang dở. Rà dữ liệu và dòng chạy phát hiện bench dùnggetterreadonly, RSSsai process và cờvsync khẳngđịnh quá mức; soak tăngbộnhớ vượtngưỡng nhưng không fail; scoreboard lấy cảđiểm thua và có thể appendhai lần. Sửa đo lường/logic, giữ testthuần, chạy cảnhbench thật30s vàsoak10đêm, rồi browser/testasset/releaseZIP/MP4. Vercel được giữ là hostingwebtĩnh, không tạo APIghiđĩa trên serverless.

## AI hiệu quả và sai ở đâu

Hiệu quả nhất là giao việc có contract chính xác và một kiểm tra có thể chạy. Cùng logic cho GUI/headless giúp sửa một nơi. Những lần AI hiểu thiếu (thắngsớm vẫn áp ởphase3, đoNodeRSSthayChrome, dùngtổngđiểm fallbackđêmthua) chỉ lộ khi đọc thứ tựtick, schema và outputthật. Vì vậy tênfile đẹp hoặc lời khẳngđịnh hoàn thành không được dùng làm bằng chứng.

Harness hữu ích: AGENTSngắn chỉ rõ entrypoint/lệnh/điều cấm; verifyfail-fast vàCI; module testchoinput/tick/boundary vàPlaywrightchogiao diện. Báo cáo ghi seed,scenario,output và cấu hình máy. Giữ tag cũ giúp truy vết thay đổi. Không dùng subagent mới trong lượt hoàn thiện; phần Antigravity trước đó không coi là reviewđộc lập.

## Token và chi phí

Không có telemetry billing đầy đủ của Codex/Antigravity. Dự toán hồi cứu rất thô cho cảbốnphase: khoảng0,2–1triệu token gồm prompt/context được đọc lại và output; khoảng này suy từ số lượt tương tác, tài liệu, mã và vòng kiểm chứng, sai số lớn, **không phải số đo hay hóa đơn**. Không quy đổi ra tiền vì chưa biết gói/model/cache/usage thực tế; cần đối soát dashboard hai công cụ để có chi phí đángtin.

Tiết kiệm bằng đọc filetheonhóm, táchmoduleđộc lập, giữ dependencyít, test thuần trướcbrowser, chỉ chạy lại khi thayđổi/failure tạo lýdo. Không cần tạo ảnhAI vì hình họcthủtục đủ yêu cầu. Không cố đoán bảng chuẩn bịthiếu hoặc nội dung phasechưa phát hành.

## Nếu làm lại

Lập bảng testcontract và acceptancecriteria từngphase ngay từđầu; chuẩn bị factorybenchmark và lifecycle reset cùng mô phỏng, thay vì sửa cách dựnggame bằng monkeypatch. Phân biệt dữliệuchuẩn, hiệuứng vàtínhnăngbổsung ởcấumodule. Tíchhợp scoreboardbrowser/file bằng adapter ngay từđầu. Ghi usage/chi phí sau mỗi phase thay vì ướclượng cuối. Thêm reviewđộc lập và người chơi thật trước phát hành; các sốtrênmáytựđo và browserautomation không thay thế hidden tests hoặc trải nghiệm thực.
