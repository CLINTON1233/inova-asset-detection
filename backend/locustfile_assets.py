from locust import HttpUser, task, between


class AssetsUser(HttpUser):
    host = "http://localhost:5001"
    wait_time = between(1, 2)

    def on_start(self):
        self.token = None
        self.preparation_id = None
        self.preparation_type = None
        self.asset_id = None
        self.login()

    def get_headers(self):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }

    # ================= LOGIN =================
    def login(self):
        with self.client.post(
            "/api/login",
            json={
                "email": "clintonalfaro664@gmail.com",
                "password": "Sumaterapos123"
            },
            name="Assets - Login",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("token"):
                        self.token = data["token"]
                        response.success()
                    else:
                        response.failure("Token tidak ditemukan")
                except Exception as e:
                    response.failure(f"Gagal parsing login response: {str(e)}")
            else:
                response.failure(f"Login gagal: {response.status_code}")

    # ================= GET SESSIONS WITH ASSETS =================
    def get_asset_sessions(self):
        with self.client.get(
            "/api/assets/sessions-with-assets",
            headers=self.get_headers(),
            name="Assets - Get Sessions With Assets",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("success"):
                        sessions = data.get("data", [])
                        if sessions:
                            session = sessions[0]
                            self.preparation_id = session.get("id_preparation")
                            self.preparation_type = session.get("type", "device")
                            response.success()
                            return True
                        else:
                            response.failure("Tidak ada session assets")
                            return False
                    else:
                        response.failure("Gagal mengambil session assets")
                        return False
                except Exception as e:
                    response.failure(f"Gagal parsing session assets: {str(e)}")
                    return False
            else:
                response.failure(f"Error assets session API: {response.status_code}")
                return False

    # ================= GET ASSETS BY PREPARATION =================
    def get_assets_by_preparation(self):
        if not self.preparation_id or not self.preparation_type:
            return False

        with self.client.get(
            f"/api/assets/by-preparation/{self.preparation_id}?type={self.preparation_type}",
            headers=self.get_headers(),
            name="Assets - Get Assets By Preparation",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("success"):
                        assets = data.get("data", [])
                        if assets:
                            self.asset_id = assets[0].get("id_assets")
                            response.success()
                            return True
                        else:
                            response.failure("Tidak ada assets pada session")
                            return False
                    else:
                        response.failure("Gagal mengambil assets by preparation")
                        return False
                except Exception as e:
                    response.failure(f"Gagal parsing assets by preparation: {str(e)}")
                    return False
            else:
                response.failure(f"Assets by preparation gagal: {response.status_code}")
                return False

    # ================= GET ASSET DETAIL =================
    def get_asset_detail(self):
        if not self.asset_id:
            return False

        with self.client.get(
            f"/api/assets/{self.asset_id}",
            headers=self.get_headers(),
            name="Assets - Get Asset Detail",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("success"):
                        response.success()
                        return True
                    else:
                        response.failure("Gagal mengambil detail asset")
                        return False
                except Exception as e:
                    response.failure(f"Gagal parsing detail asset: {str(e)}")
                    return False
            else:
                response.failure(f"Detail asset gagal: {response.status_code}")
                return False

    # ================= GET ALL ASSETS =================
    def get_all_assets(self):
        with self.client.get(
            "/api/assets",
            headers=self.get_headers(),
            name="Assets - Get All Assets",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("success"):
                        response.success()
                        return True
                    else:
                        response.failure("Gagal mengambil semua assets")
                        return False
                except Exception as e:
                    response.failure(f"Gagal parsing all assets: {str(e)}")
                    return False
            else:
                response.failure(f"Get all assets gagal: {response.status_code}")
                return False

    # ================= TASK =================
    @task
    def view_assets(self):
        if not self.token:
            self.login()
            if not self.token:
                return

        self.preparation_id = None
        self.preparation_type = None
        self.asset_id = None

        # 1. Ambil semua assets
        self.get_all_assets()

        # 2. Ambil daftar session yang punya asset
        if not self.get_asset_sessions():
            return

        # 3. Buka detail assets berdasarkan session
        if not self.get_assets_by_preparation():
            return

        # 4. Buka detail satu asset
        self.get_asset_detail()