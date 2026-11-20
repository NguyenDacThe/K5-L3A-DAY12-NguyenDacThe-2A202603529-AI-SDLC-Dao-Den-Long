# PRD-0 / Test Contract v1.0 — Phase 1

Nguồn: nội dung lab board do người dùng cung cấp trong chat ngày 20/11/2026. Đây là bản ghi có cấu trúc, không phải bản sao nguyên văn toàn bộ giao diện lab board. Chỉ triển khai Phase 1.

## Yêu cầu sản phẩm

Game 3D Đảo Đèn Lồng; Mây đội nón lá có đèn nhỏ, đi/nhảy với camera 3D trên đảo tròn Đảo Bến. Nhặt đom đóm, nạp vào 5 Đèn Lồng Lớn; Bóng Mực sinh ra, đuổi, gây mất máu khi chạm. Tỏa sáng tốn ánh sáng để xua chúng; chúng sợ đèn. Thắp hết đèn thắng, hết máu thua; có điểm, HUD, chơi lại. Không khí đêm cổ tích, vàng cam ấm/tím đen nguy hiểm, đảo sáng dần, không máu me.

Công nghệ tự chọn, chạy macOS/Linux (web được phép). Bàn giao: tag phase-1, README cài/chạy <=3 lệnh, điều khiển/điểm, game.contract.json, headless, bằng chứng thật, giả định, AI log, harness. Sáng tạo không làm đổi output headless và ghi trong README.

## Contract bắt buộc

File game.contract.json: contract_version="1.0", team, build_cmd, run_cmd, headless_cmd và tuning chính xác. Khóa tuning và giá trị dùng thật nằm trong file gốc. Không có khái niệm thì null/false và giải thích.

```text
<headless_cmd> --seed <int> --night 1 [--scenario <file.json>] [--inputs <file.json>]
               --ticks <int> --out <file.jsonl> [--snapshot-every <int>]
```

- 60 tick/s, không cửa sổ/GPU, không đợi thời gian thực; snapshot-every mặc định 10.
- Tick 0 là sau dựng scenario, trước input; bước k đọc input tick k tạo trạng thái k+1, event ghi k+1. N ticks đúng N bước trừ khi kết thúc sớm. sim_tick=tick ở Phase 1.
- time_left_s = thời lượng còn lại ban đầu trừ số bước/60.
- Thành công mã 0, lỗi khác 0 + stderr; file inputs/scenario sai định dạng mã 2.
- Mét, Y lên trên, mặt đất Y=0, spawn [0,0,0]. player.pos là chân, shade.pos là tâm, lantern.pos là chân cột, mote là điểm trên đất.
- Khoảng cách dùng XZ giữa các điểm, không cộng kích thước; trong bán kính nghĩa là <=r.

## Inputs

```json
{"frames":[{"tick":0,"move":[0,1],"cam_yaw_deg":0},{"tick":120,"move":[0,0],"interact":true},{"tick":121,"interact":false},{"tick":200,"pulse":true},{"tick":201,"pulse":false}]}
```

Mặc định move=[0,0], yaw=0, nút false. Frame chỉ đổi trường hiện diện; tick nguyên tăng nghiêm ngặt. move=[x,z], từng thành phần [-1,1], chuẩn hóa nếu dài >1. Với theta=yaw: x'=x*cos(theta)+z*sin(theta), z'=-x*sin(theta)+z*cos(theta). jump/interact/pulse (dash nếu có) boolean, kích hoạt false→true. Không inputs thì đứng yên.

## Scenario

```json
{"player":{"pos":[0,0,0],"carried":0,"flames":3},"random_motes":false,"random_shades":false,"motes":[[0,0,5]],"shades":[{"pos":[10,0,0]}],"lanterns":[{"id":"L1","pos":[0,0,25],"deposited":0}],"time_left_s":300}
```

random_motes/shades=false tắt tự sinh, shade kê sẵn hoạt động bình thường ngay. motes/shades thay danh sách mặc định, [] là không có; shades hỗ trợ id. lanterns cập nhật theo L1…L5, đèn không nhắc giữ nguyên; hỗ trợ pos/deposited/lit:true. Trường vắng dùng mặc định. Dựng scenario không phát event hay cộng điểm.

## JSONL

Snapshot từ tick 0 mỗi khoảng tick: type=snapshot, tick, sim_tick, state, time_left_s, score, player.{pos,flames,carried}, lanterns[].{id,pos,lit,deposited}, shades[].{id,pos,state}, motes_active. Khuyến nghị thêm motes[].{id,pos}.

Event: type=event, tick, name, data:

| name | data |
|---|---|
| mote_picked | carried |
| deposit | lantern_id, amount, deposited |
| lantern_lit | lantern_id |
| pulse | stunned_ids |
| player_hit | by: shade hoặc fall, flames, dropped |
| shade_spawned | id |
| game_over | result: won/lost, reason: all_lit/dawn/no_flames |

Dòng cuối bắt buộc type=end, ticks, state, score. state=playing/won/lost, shade tối thiểu có stunned. Tọa độ làm tròn 3 số thập phân. Cùng seed/scenario/inputs output giống từng byte, kể cả id sinh tự động. Không phát event không tồn tại trong game (ví dụ fall nếu không phạt rơi).
