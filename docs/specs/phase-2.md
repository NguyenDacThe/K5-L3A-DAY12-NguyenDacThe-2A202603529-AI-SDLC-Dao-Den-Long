# Ticket-02 — Ba hòn đảo / Contract v1.1

Nguồn: [nội dung người dùng gửi](phase-2-ticket.txt), cùng hai phần bổ sung trong chat: số liệu chuẩn và bảng màu. Tài liệu này tóm tắt các ràng buộc và tiêu chí nghiệm thu; không phải yêu cầu Phase 3.

## Số liệu chuẩn thay Phase 1

| Nhóm | Giá trị |
|---|---|
| Chạy / nhảy | 6 m/s, đáp ứng <=0.1s, điều khiển trên không; nhảy 7 m/s, gravity -20 m/s², chỉ khi grounded |
| Dash | 14 m/s, 12 tick, cooldown 90 tick từ lúc bắt đầu; hướng di chuyển hoặc hướng mặt; trên không giữ độ cao; không bất tử |
| Motes | Mang tối đa 10; pickup XZ<=1 m, chênh cao chân/đất<=1.5 m; 20 đầu màn tại điểm khác nhau, trần30, mỗi240tick thêm1 tại điểm trống |
| Đèn | Cost10, nạp từng phần; XZ<=2 m, chọn đèn chưa sáng gần nhất, hòa thì id nhỏ nhất |
| An toàn | Bán kính6 m; địch ngoài chặn tại mép, địch trong khi sáng đẩy ra trong<=30tick, không hit khi đang bị đẩy |
| Pulse | Tốn3, cooldown180tick, tâm chân+[0,.8,0], mục tiêu chốt theo khoảng cách3D<=5 m; stun120tick, đẩy4 m trong15tick đầu, gặp vật cản dừng, trùng vị trí đẩy+X; trúng lại refresh |
| Bóng Mực | 4 m/s (Đêm3:4.5), phát hiện12/bỏ đuổi18; chạm XZ<=1 và chênh cao<=1.5; max1hit/tick; recoil2 m/60tick; không phản ứng hit khi Mây bất tử |
| Hit | Mất1 lửa; floor(carried/2) rơi vành1.5–2.5 m, TTL480tick, nhặt từ bước sau; invuln90tick |
| Fall | Y<-10, bỏ qua bất tử: mất1 lửa và toàn bộ đom đóm; chờ60tick rồi spawn, velocity0, invuln90; hếtlửa thua ngay |
| Lửa / thời gian | 3 mỗi đêm; thời lượng 300/330/360 giây |
| Điểm | +10 mỗi đom đóm nạp, +100 mỗi đèn, +5 mỗi shade trúng pulse; thắng cộng floor(time)*2+flames*50; tổng chỉ gồm đêm thắng |

Thứ tự bước: pause input → giảm timer → di chuyển/nhảy/dash/pad/wind/fall → pickup → deposit → safe zones → pulse → di chuyển shade/drifter → drifter steal rồi shade hit theo id → spawn → kết thúc → snapshot. Tick vẫn tăng khi paused; sim_tick và gameplay đứng yên. Thua hết lửa ưu tiên cao nhất, sau đó thắng đủ đèn, sau đó dawn.

## Bản đồ

Tọa độ đầy đủ được chép trong phase-2-ticket.txt và triển khai ở src/world.mjs. Đêm1 bán kính40, 5đèn,24điểm motes/12điểm shade; Đêm2 hai đảo radius28 tâm0/70, cầu[26,44]x[-2,2], 2pad14Y/24ngang,6đèn; Đêm3 radius45, tầng0/3/6, 2dốc30°/150° rộng3, pad12Y/8ngang, tháp cao8 radius2,7đèn. Spawnshade2con tick300 rồi thêm1 theo chu kỳ480/420/360, cap6/8/10, điểm cách người>=15; drifter ở tick1200,2400,… cap2.

## Acceptance criteria từng mục Phần 3

| Mục | Tiêu chí kiểm chứng được | Cách kiểm chứng |
|---|---|---|
| 1. Gió Lạc | Đêm2/3 sinh đúng lịch, idle2/chase7/flee7; >=5 và <=15 mới chase; cướpmin3 ở<=1.2, không mấtlửa, flee240; pulsechase xua, pulseflee trảđồ tại chỗ rồi120tick biến mất; safe/invuln không chặn | steal/drifter-drop/spawn scenario + module tests |
| 2. Bùa Gió | Đúng vị trí/id; pickup600tick, làm mới; chạy7.2, dash14/12tick khôngcooldown nhưng cần cạnhnhấn, không cắt dashđangchạy; respawn2700tick | charm/charm-dash scenario + module tests |
| 3. Chuỗi3đêm | Menu→intro tên/lời Ông Đăng→play→result→next; won3→Bình Minh/tổng, thua retryđêmhiệntại | campaign tests + Chrome fixture đi đủluồng |
| 4. Pause | Esc/P dừng timer/entity/TTL; tiếp tục/chơi lại/cài đặt/menu hoạt động | pause scenario + Chrome |
| 5. Settings | Volume/mouse sensitivity điều chỉnh được và tồn tại sau reload | settings tests + Chrome reload |
| 6. Audio | Nhạc nền, pickup/light/pulse/hit/jump/dash/win/loss/spawn/countdown10s; cảnh báo gió cóâmthanh | WebAudio procedural src/audio.mjs; Chrome khônglỗi; nghethủcông còn cần review |
| 7. HUD | Lửa trái, timer giữa mm:ss đỏ/nháy<=30s, đèn/điểm phải,10ôcarry dưới, icon+cooldown dash/pulse, nhắcE(x/10), chỉđèn ngoàimàn | Chrome ảnh + assert10ô; source HUD |
| 8. Palette | Màu chuẩn và ambient=.15+.55*(lit/count) | src/palette.mjs dùng đúnghex + source/ảnh |

## Palette chính thức

Trời #0E1430, sương #1B2350; cỏ #2F5D50, cát #C9B48A, gỗ #6B4A2F, mây #12384A; đènsáng #FFB347, lõi #FFE9B0, tắt #5B5F6E; mote #FFF6C2, halo #FFE58A; shade #120A1A, viền #7A3CFF, stunned #3A3450; áo #E8E2D0, khăn/bùa #C8102E; vàng #F2C14E, drifter #8FA3B8; nguyhiểm #FF5A5F, UI #F5F1E6. Sai lệch cho phép10%/kênh, khai báo dùng đúnghex.

## Contract v1.1

Giữ v1.0, tăng version1.1, --night=1/2/3. Tuning thêm dash_speed/duration_s/cooldown_s và night2/3_duration_s. Snapshot thêm night, wind{active,dir_deg}; player.vel/grounded/invuln/dash_cd_s/pulse_cd_s/charm_s; motes{id,pos,kind,ttl_s}, drifters{id,pos,state,stolen}, charms{id,available,respawn_s} bắt buộc. Scenario thêm player.invuln_ticks/dash_cd_ticks/pulse_cd_ticks/charm_ticks, shade.state/state_ticks_left, drifters/charms và random_drifters/wind_enabled. Input dash/pause dùng cạnhnhấn. Event mới dash{}, charm_picked{charm_id,charm_ticks}, drifter_steal{drifter_id,amount,carried}, drifter_drop{drifter_id,amount}, night_start{night}, paused{}, resumed{}; fall player_hit thêm lost. Shade state đúng spawning/wander/chase/recoil/stunned.

Headless<=21600tick trong<=30s; bình thường FPS>=30 ở1280x720. Giữ kiểm chứng Phase1 với số chuẩn, ghi lý do thay test, harness cập nhật. Có scenario cho cơ chế mới và bằng chứng thật khớp tag.
