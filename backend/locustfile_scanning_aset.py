from locust import HttpUser, task, between
import base64
import mimetypes
import os


class ScanningAssetUser(HttpUser):
    host = "http://localhost:5001"
    wait_time = between(1, 2)

    def on_start(self):
        self.token = None
        self.preparation_id = None
        self.item_id = None
        self.item_preparation_id = None
        self.scan_id = None

        # 2 gambar:
        # 1. device.jpg -> untuk deteksi perangkat
        # 2. serial.jpg -> untuk deteksi serial number
        self.device_image_data = self.load_test_image("test_images/device.jpg")
        self.serial_image_data = self.load_test_image("test_images/serial.jpg")

        self.login()

    def load_test_image(self, image_path):
        """
        Membaca file gambar lokal dan mengubahnya menjadi base64 data URL.
        """
        if not os.path.exists(image_path):
            print(f"[WARNING] File gambar tidak ditemukan: {image_path}")
            return None

        mime_type, _ = mimetypes.guess_type(image_path)
        if not mime_type:
            mime_type = "image/jpeg"

        with open(image_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")

        return f"data:{mime_type};base64,{encoded}"

    def get_headers(self):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }

    def login(self):
        with self.client.post(
            "/api/login",
            json={
                "email": "clintonalfaro664@gmail.com",
                "password": "Sumaterapos123"
            },
            name="Scanning Assets - Login",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("success") is True and data.get("token"):
                        self.token = data["token"]
                        response.success()
                    else:
                        response.failure("Login berhasil tetapi token tidak ditemukan")
                except Exception as e:
                    response.failure(f"Gagal parsing response login: {str(e)}")
            else:
                response.failure(f"Login gagal, status code: {response.status_code}")

    def validate_token(self):
        with self.client.get(
            "/api/protected",
            headers=self.get_headers(),
            name="Scanning Assets - Validate Token",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
                return True
            else:
                response.failure(f"Validasi token gagal: {response.status_code}")
                return False

    def pick_latest_preparation(self):
        """
        Ambil otomatis session device hasil load test scanning preparation
        yang statusnya pending / in-progress.
        """
        with self.client.get(
            "/api/scanning-preparation/list-all",
            headers=self.get_headers(),
            name="Scanning Assets - Load Sessions",
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"Load sessions gagal: {response.status_code}")
                return False

            try:
                data = response.json()
                if not data.get("success"):
                    response.failure("Load sessions gagal")
                    return False

                sessions = data.get("data", [])
                filtered = []

                for s in sessions:
                    session_type = s.get("type") or ("device" if s.get("category_id") == 1 else "material")
                    session_name = (s.get("checking_name") or "").lower()
                    session_status = (s.get("status") or "").lower()

                    if (
                        session_type == "device"
                        and session_status in ["pending", "in-progress"]
                        and "load test scanning prep" in session_name
                    ):
                        filtered.append(s)

                if not filtered:
                    for s in sessions:
                        session_type = s.get("type") or ("device" if s.get("category_id") == 1 else "material")
                        session_status = (s.get("status") or "").lower()
                        if session_type == "device" and session_status in ["pending", "in-progress"]:
                            filtered.append(s)

                if not filtered:
                    response.failure("Tidak ada session device pending/in-progress yang tersedia")
                    return False

                target = filtered[0]
                self.preparation_id = target.get("id_preparation")
                response.success()
                return True

            except Exception as e:
                response.failure(f"Gagal parsing sessions: {str(e)}")
                return False

    def load_preparation_detail(self):
        with self.client.get(
            f"/api/devices/scanning-preparation/{self.preparation_id}",
            headers=self.get_headers(),
            name="Scanning Assets - Load Preparation Detail",
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"Load preparation detail gagal: {response.status_code}")
                return False

            try:
                data = response.json()
                if data.get("success") is True and data.get("data"):
                    items = data["data"].get("items", [])
                    if items:
                        self.item_id = items[0].get("id_item")
                        response.success()
                        return True
                    else:
                        response.failure("Preparation detail tidak memiliki item")
                        return False
                else:
                    response.failure("Load preparation detail gagal")
                    return False
            except Exception as e:
                response.failure(f"Gagal parsing preparation detail: {str(e)}")
                return False

    def load_progress(self):
        with self.client.get(
            f"/api/devices/scanning-preparation/{self.preparation_id}/progress",
            headers=self.get_headers(),
            name="Scanning Assets - Load Progress",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("success") is True:
                        response.success()
                        return True
                    else:
                        response.failure("Load progress gagal")
                        return False
                except Exception as e:
                    response.failure(f"Gagal parsing progress: {str(e)}")
                    return False
            else:
                response.failure(f"Load progress gagal: {response.status_code}")
                return False

    def get_available_item(self):
        with self.client.get(
            f"/api/devices/items-preparation/{self.preparation_id}/item/{self.item_id}/available",
            headers=self.get_headers(),
            name="Scanning Assets - Get Available Item",
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"Get available item gagal: {response.status_code}")
                return False

            try:
                data = response.json()
                if data.get("success") is True and data.get("data"):
                    self.item_preparation_id = data["data"].get("id_item_preparation")
                    response.success()
                    return True
                else:
                    response.failure("Available item tidak ditemukan")
                    return False
            except Exception as e:
                response.failure(f"Gagal parsing available item: {str(e)}")
                return False

    def detect_device(self):
        if not self.device_image_data:
            print("[WARNING] File test_images/device.jpg tidak ditemukan")
            return None

        with self.client.post(
            "/api/detect/camera",
            headers=self.get_headers(),
            json={"image_data": self.device_image_data},
            name="Scanning Assets - Detect Device",
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"Deteksi device gagal: {response.status_code}")
                return None

            try:
                data = response.json()
                if data.get("success") is True:
                    detected_items = data.get("detected_items", [])
                    if detected_items:
                        response.success()
                        return detected_items[0]
                    else:
                        response.failure("Tidak ada device terdeteksi")
                        return None
                else:
                    response.failure("Deteksi device gagal")
                    return None
            except Exception as e:
                response.failure(f"Gagal parsing detect device: {str(e)}")
                return None

    def save_scan_result(self, detected_item):
        asset_type = detected_item.get("asset_type", "Laptop")

        payload = {
            "item_preparation_id": self.item_preparation_id,
            "user_id": 1,
            "scan_category": "Devices",
            "scan_value": asset_type,
            "serial_number": None,
            "detection_data": {
                "bounding_box": detected_item.get("bounding_box"),
                "photo_proof": None,
                "confidence": detected_item.get("confidence", 0.85),
                "asset_type": asset_type,
                "category": detected_item.get("category", "Perangkat")
            },
            "status": "pending",
            "notes": f"Load testing scanning asset: {asset_type}",
            "photo_data": self.device_image_data
        }

        with self.client.post(
            "/api/scan-results/create-device",
            headers=self.get_headers(),
            json=payload,
            name="Scanning Assets - Save Scan Result",
            catch_response=True
        ) as response:
            if response.status_code in [200, 201]:
                try:
                    data = response.json()
                    if data.get("success") is True:
                        # ambil scan_id dari response
                        self.scan_id = data.get("scan_id") or data.get("id_scan") or data.get("data", {}).get("id_scan")
                        response.success()
                        return True
                    else:
                        response.failure("Simpan scan result gagal")
                        return False
                except Exception as e:
                    response.failure(f"Gagal parsing save scan result: {str(e)}")
                    return False
            else:
                response.failure(f"Simpan scan result gagal: {response.status_code}")
                return False

    def detect_serial(self):
        if not self.serial_image_data:
            print("[WARNING] File test_images/serial.jpg tidak ditemukan")
            return None

        with self.client.post(
            "/api/serial/detect/camera",
            headers=self.get_headers(),
            json={"image_data": self.serial_image_data},
            name="Scanning Assets - Detect Serial Number",
            catch_response=True
        ) as response:
            if response.status_code != 200:
                response.failure(f"Deteksi serial number gagal: {response.status_code}")
                return None

            try:
                data = response.json()
                if data.get("success") is True:
                    serial_detections = data.get("serial_detections", [])
                    valid_serials = [s for s in serial_detections if s.get("is_valid")]

                    if valid_serials:
                        response.success()
                        return valid_serials[0]
                    elif serial_detections:
                        response.failure("Serial number terdeteksi tetapi tidak valid")
                        return None
                    else:
                        response.failure("Tidak ada serial number terdeteksi")
                        return None
                else:
                    response.failure("Deteksi serial number gagal")
                    return None
            except Exception as e:
                response.failure(f"Gagal parsing detect serial: {str(e)}")
                return None

    def update_scan_result_with_serial(self, serial_data):
        if not self.scan_id:
            return False

        serial_number = serial_data.get("detected_text")
        if not serial_number:
            return False

        payload = {
            "serial_number": serial_number,
            "status": "serial_scanned",
            "scanned_by": 1,
            "scanned_at": "2026-04-16T00:00:00",
            "notes": f"Serial number detected: {serial_number}"
        }

        with self.client.put(
            f"/api/scan-results/device/{self.scan_id}",
            headers=self.get_headers(),
            json=payload,
            name="Scanning Assets - Update Serial Number",
            catch_response=True
        ) as response:
            if response.status_code in [200, 201]:
                try:
                    data = response.json()
                    if data.get("success") is True:
                        response.success()
                        return True
                    else:
                        response.failure("Update serial number gagal")
                        return False
                except Exception as e:
                    response.failure(f"Gagal parsing update serial: {str(e)}")
                    return False
            else:
                response.failure(f"Update serial number gagal: {response.status_code}")
                return False

    @task
    def scan_assets(self):
        if not self.token:
            self.login()
            if not self.token:
                return

        self.preparation_id = None
        self.item_id = None
        self.item_preparation_id = None
        self.scan_id = None

        # 1. Validasi token
        if not self.validate_token():
            return

        # 2. Ambil session scanning
        if not self.pick_latest_preparation():
            return

        # 3. Buka detail preparation
        if not self.load_preparation_detail():
            return

        # 4. Cek progress scanning
        if not self.load_progress():
            return

        # 5. Ambil item available
        if not self.get_available_item():
            return

        # 6. Deteksi device
        detected_item = self.detect_device()
        if not detected_item:
            return

        # 7. Simpan hasil scan device
        if not self.save_scan_result(detected_item):
            return

        # 8. Deteksi serial number
        serial_data = self.detect_serial()
        if not serial_data:
            return

        # 9. Update hasil scan dengan serial number
        self.update_scan_result_with_serial(serial_data)