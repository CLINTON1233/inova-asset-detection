from locust import HttpUser, task, between
from datetime import datetime
import random
import string


class ScanningPreparationUser(HttpUser):
    host = "http://localhost:5001"
    wait_time = between(1, 2)

    def on_start(self):
        self.token = None
        self.login()

    def login(self):
        with self.client.post(
            "/api/login",
            json={
                "email": "clintonalfaro664@gmail.com",
                "password": "Sumaterapos123"
            },
            name="Scanning Preparation - Login",
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

    def generate_random_checking_name(self):
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        return f"Load Test Scanning Prep {suffix}"

    @task
    def create_scanning_preparation(self):
        if not self.token:
            self.login()
            if not self.token:
                return

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }

        # 1. Validasi token
        with self.client.get(
            "/api/protected",
            headers=headers,
            name="Scanning Preparation - Validate Token",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Validasi token gagal: {response.status_code}")

        # 2. Load master data untuk form create
        with self.client.get(
            "/api/location/all",
            headers=headers,
            name="Scanning Preparation - Load Locations",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Load locations gagal: {response.status_code}")

        with self.client.get(
            "/api/department/all",
            headers=headers,
            name="Scanning Preparation - Load Departments",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Load departments gagal: {response.status_code}")

        with self.client.get(
            "/api/projects/list",
            headers=headers,
            name="Scanning Preparation - Load Projects",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Load projects gagal: {response.status_code}")

        with self.client.get(
            "/api/master-receivers/list",
            headers=headers,
            name="Scanning Preparation - Load Receivers",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Load receivers gagal: {response.status_code}")

        with self.client.get(
            "/api/master-devices/list",
            headers=headers,
            name="Scanning Preparation - Load Master Devices",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Load master devices gagal: {response.status_code}")

        # 3. Create scanning preparation (devices)
        payload = {
            "checking_name": self.generate_random_checking_name(),
            "category_id": 1,
            "location_id": 1,
            "checking_date": datetime.now().strftime("%Y-%m-%d"),
            "remarks": "Load testing create scanning preparation",
            "items": [
                {
                    "device_name": "Laptop Dell",
                    "device_detail": "Laptop Dell New Version",
                    "brand": "Dell",
                    "vendor": "PT DUTA Computer",
                    "model": "Latitude 3420",
                    "specifications": "Intel i5, 8GB RAM, 256GB SSD",
                    "quantity": 1,
                    "departments": [],
                    "receivers": [],
                    "project_id": None,
                    "is_stock": True
                }
            ],
            "user_id": 1
        }

        with self.client.post(
            "/api/devices/scanning-preparation/create",
            headers=headers,
            json=payload,
            name="Scanning Preparation - Create Device Session",
            catch_response=True
        ) as response:
            if response.status_code in [200, 201]:
                try:
                    data = response.json()
                    if data.get("success") is True:
                        response.success()
                    else:
                        response.failure("Create scanning preparation gagal")
                except Exception as e:
                    response.failure(f"Gagal parsing create response: {str(e)}")
            else:
                response.failure(f"Create scanning preparation gagal: {response.status_code}")