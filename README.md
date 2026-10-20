# ipz

App chia sẻ ảnh đơn giản: bấm **Tải ảnh lên**, mọi người dùng app đều thấy ảnh đó (tự cập nhật mỗi 5 giây).

## Cài đặt & chạy

Yêu cầu: [Node.js](https://nodejs.org) 18 trở lên. **Không cần `npm install`** — app không dùng thư viện ngoài.

```bash
git clone https://github.com/<ten-ban>/ipz.git
cd ipz
node server.js
```

Mở http://localhost:3000

## Cho nhiều người cùng xem

Ảnh được lưu trên máy chạy server, nên mọi người phải truy cập **cùng một server**:

- **Cùng mạng LAN/Wi-Fi:** mở `http://<IP-máy-chạy-server>:3000` trên máy khác.
- **Qua Internet:** deploy lên một dịch vụ chạy Node.js có ổ đĩa lưu trữ (Render, Railway, Fly.io, VPS...). Biến môi trường `PORT` được hỗ trợ sẵn.

## Tính năng

- Tải nhiều ảnh cùng lúc (JPG, PNG, GIF, WEBP, tối đa 10MB/ảnh)
- Server kiểm tra nội dung file thật sự là ảnh
- Thư viện ảnh dạng lưới, bấm vào để phóng to
- Không cần đăng nhập

## Lưu ý

Ai cũng tải lên và xem được, chưa có kiểm duyệt hay đăng nhập. Nếu đưa ra Internet công khai, nên thêm xác thực.
