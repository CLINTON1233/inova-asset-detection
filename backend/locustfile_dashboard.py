from locust import HttpUser, task, between

class DashboardUser(HttpUser):
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
            name="Dashboard - Login",
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

    @task
    def open_dashboard(self):
        if not self.token:
            self.login()
            if not self.token:
                return

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }

        # 1. validasi token / akses protected route
        with self.client.get(
            "/api/protected",
            headers=headers,
            name="Dashboard - Validate Token",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Validasi token gagal: {response.status_code}")

        # 2. ambil seluruh scanning preparation
        with self.client.get(
            "/api/scanning-preparation/list-all",
            headers=headers,
            name="Dashboard - Load Sessions",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "success" in data:
                        response.success()
                    else:
                        response.failure("Response sessions tidak sesuai format")
                except Exception as e:
                    response.failure(f"Gagal parsing sessions: {str(e)}")
            else:
                response.failure(f"Load sessions gagal: {response.status_code}")

        # 3. ambil data validations
        with self.client.get(
            "/api/validations",
            headers=headers,
            name="Dashboard - Load Validations",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "success" in data:
                        response.success()
                    else:
                        response.failure("Response validations tidak sesuai format")
                except Exception as e:
                    response.failure(f"Gagal parsing validations: {str(e)}")
            else:
                response.failure(f"Load validations gagal: {response.status_code}")