# Phase 2 — quyết định, thay đổi và evaluation

## Yêu cầu và thiết kế

Đọc [Ticket-02 + acceptance criteria](../specs/phase-2.md). Người dùng bổ sung số chuẩn và palette trong chat sau file dán đầu tiên bị thiếu bảng. Dùng đúng bảng chuẩn; không dùng số Phase1 để lấp chỗ thiếu.

Mô phỏng v1.1 nằm ở src/game-v11.mjs (game.mjs là entrypoint ổn định), đọc cùng tuning với UI. world.mjs định nghĩa geometry/points; world-view.mjs chỉ tạo hình. drifters/charms/wind có hàm thuần dùng chung; campaign quản lý điểm các đêm thắng; settings lưu qua localStorage; audio dùng WebAudio. Headless giữ một đêm mỗi lần gọi, thêm night1/2/3 và pause.

## Thay giả định Phase 1 và test hồi quy

Không bỏ test hoặc tắt kiểm tra. tests/contract.test.mjs giữ các nhóm kiểm tra cũ, sửa expectation theo Ticket02:

- Carry20→10, radius1.5→1, chênh cao<=1.5; pickup không có điểm, deposit nhận +10/đốm.
- Interact3→2, pulse2→3, radius6→5 xét3D, push tức thì→4m/15tick, stun180→120.
- Invuln120→90, safe5→6 và cho phép đứng đúng mép (>=6), đẩy ra trong30tick.
- Đốm hit tan biến→đom đóm rơi TTL480, nhặt lại từ bước sau.
- Mép đảo chặn→rơi/respawn; thưởng thời gian×2; snapshot có event night_start nên chọn snapshot theo type/tick thay index dòng.
- Bot nguyên màn dùng dash và chọn đường tránh địch nhanh hơn; giữ seed2026 và toàn bộ spawn mặc định, không sửa trạng thái game để thắng.

Bằng chứng Phase1 và tag cũ không được tạo lại bởi verify mới. Tệp tests.txt Phase1 đã có thay đổi local khi bắt đầu lượt này; không đưa thay đổi đó vào commit Phase2.

## Giả định còn mơ hồ trong ticket

- Giữ spawn(0,0,0) theo contract cho cả3 đêm. Đêm3 tầng0 trải toàn đảo; origin nằm dưới đĩa tầng2. Cho nhân vật đi ra khỏi khoảng bên dưới, không đi vào vách từ ngoài. View tạm ẩn lõi/tháp khi nhân vật nằm dưới, tránh che nhân vật. Tháp chặn từY6 tớiY14. Có test thoát origin và test ramp/pad lên tầng cao.
- Shade mới spawning60tick rồi wander1m/s; wander dùng hướng lượn tất định, chase12/18m. Các số không được chuẩn hóa trong ticket này được ghi rõ, không đưa vào tuning chuẩn dưới tên khác.
- Shade center khi sinh = mặt đất+.8; scenario.pos được giữ nguyên tick0. Detection và safe dùngXZ; pulse dùng3D đúng yêu cầu. Shade di chuyển trên mặt đất/tầng phù hợp, không đi lên vách hoặc qua biển.
- Recoil bắt đầu ngay lúc hit (bước đầu2/60m), còn lại ở59bước sau, tổng2m nếu không vướng vật cản.
- Góc bản đồ/gió dùng x=cos(angle), z=sin(angle). Gió báo trước tick1680 rồi active1800…2099; các lần sau cách1800tick.
- Dropped motes hit rải vành1.5–2.5; drifter trả đồ tại chính vị tríXZ, đặt xuống mặt đất. TTL480 cho cảhai. Bùa/đom đóm dùng cùng kiểm tra độcao.
- Scenario hỗ trợ motes dạng mảngv1.0, thêm dạngobject {id,pos,kind,ttl_ticks} để kiểm tra TTL. charms hỗ trợ id+pos hoặc id của vịtrí chuẩn. Drifter hỗ trợ state/stolen/state_ticks_left. TTL random=null vì không hết hạn.
- night_start là event tick0 sau snapshot0, không phải điểm/sựkiện phát từ dựng scenario.
- Audio là nhạc/hiệu ứng tổng hợp nguyên bản. Âm lượng0 vẫn giữ game chạy; cài đặt trình duyệt có thể ngăn WebAudio/storage, game không phụ thuộc chúng để mô phỏng.

## Evaluation và giới hạn

- Bộ test, scenario và byte determinism/benchmark: xem ../proof/phase-2/tests.txt và verification.json.
- Nguyên màn Đêm1 mặc định có bot đi tới thắng, dùng các input chuẩn; xem playthrough.json. Không đánh đồng điều này với người chơi đi hết3đêm.
- Chrome kiểm tra menu, settings/reload, pause/settings/resume, retry, đủ3đêm tới BìnhMinh và thua/retry bằng fixture được ghi rõ. FPS đo gameplay thật1280×720 trong3giây; không phải cam kết trên mọi laptop.
- Chưa chạy hidden tests hoặc đánh giá độc lập. Chưa nghe/thẩm âm bằng người thật, chưa chơi tay trọn3đêm, chưa xác nhận CI Ubuntu trước khi GitHub trả kết quả.

## Retro ngắn

Tách geometry/AI/entity từ đầu giúp kiểm thử ngay khi bảng số còn thiếu. Test cũ phát hiện thay đổi cần giải thích, không tắt test cho xanh. Lỗi thực tế: bot cũ không dash nên thua; cải thiện bot điều khiển thay vì giảm sức mạnh địch. Khi thêm recoil/drop đã rà lại tickbirth và vịtrí thả, sửa drifter để trả tại chỗ thay vì dùng vànhhit. Harness thêm quy tắc pulse3D, tick/sim_tick và không ghi đè proof cũ.
