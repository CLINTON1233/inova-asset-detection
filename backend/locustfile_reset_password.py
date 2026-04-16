from locust import HttpUser, task, between


class ResetPasswordUser(HttpUser):
    host = "http://localhost:5001"
    wait_time = between(1, 2)

    def on_start(self):
        self.token = None
        self.user_id = None
        self.email = "clintonalfaro664@gmail.com"

        # dua password untuk toggle
        self.password_a = "Sumaterapos123"
        self.password_b = "Sukses12345"

        # asumsi awal
        self.current_password = self.password_a
        self.next_password = self.password_b

        self.login()

    def get_headers(self):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }

    def login(self):
        with self.client.post(
            "/api/login",
            json={
                "email": self.email,
                "password": self.current_password
            },
            name="Reset Password - Login",
            catch_response=True
        ) as response:

            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("success") is True and data.get("token") and data.get("user"):
                        self.token = data["token"]
                        self.user_id = data["user"]["id"]
                        response.success()
                    else:
                        response.failure("Login berhasil tetapi token/user tidak ditemukan")
                except Exception as e:
                    response.failure(f"JSON parse error saat login: {str(e)}")

            else:
                # coba login dengan password alternatif
                with self.client.post(
                    "/api/login",
                    json={
                        "email": self.email,
                        "password": self.next_password
                    },
                    name="Reset Password - Login Retry",
                    catch_response=True
                ) as retry_response:

                    if retry_response.status_code == 200:
                        try:
                            data = retry_response.json()
                            if data.get("success") is True and data.get("token") and data.get("user"):
                                # tukar current <-> next
                                self.current_password, self.next_password = self.next_password, self.current_password
                                self.token = data["token"]
                                self.user_id = data["user"]["id"]
                                retry_response.success()
                            else:
                                retry_response.failure("Login retry berhasil tetapi token/user tidak ditemukan")
                        except Exception as e:
                            retry_response.failure(f"JSON parse error saat login retry: {str(e)}")
                    else:
                        retry_response.failure(f"Login gagal pada kedua password. Status: {retry_response.status_code}")

    @task
    def reset_password(self):
        if not self.token or not self.user_id:
            self.login()
            if not self.token or not self.user_id:
                return

        with self.client.post(
            "/api/change-password",
            headers=self.get_headers(),
            json={
                "user_id": self.user_id,
                "current_password": self.current_password,
                "new_password": self.next_password
            },
            name="Reset Password - Change Password",
            catch_response=True
        ) as response:

            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("success") is True:
                        # tukar password untuk request berikutnya
                        self.current_password, self.next_password = self.next_password, self.current_password
                        response.success()
                    else:
                        response.failure("Response success = false saat change password")
                except Exception as e:
                    response.failure(f"JSON parse error saat change password: {str(e)}")
            else:
                response.failure(f"Status code error saat change password: {response.status_code}")