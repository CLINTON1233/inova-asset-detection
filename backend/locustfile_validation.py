from locust import HttpUser, task, between
import random


class ValidationUser(HttpUser):
    host = "http://localhost:5001"
    wait_time = between(1, 2)

    def on_start(self):
        self.token = None
        self.validation_ids = []

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
            name="Validation - Login",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("token"):
                    self.token = data["token"]
                    response.success()
                else:
                    response.failure("Token tidak ditemukan")
            else:
                response.failure("Login gagal")

    # ================= GET VALIDATIONS =================
    def get_validations(self):
        with self.client.get(
            "/api/validations",
            headers=self.get_headers(),
            name="Validation - Get All Validations",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    validations = data.get("data", [])

                    # ambil yang pending saja
                    pending = [v for v in validations if v["validation_status"] == "pending"]

                    self.validation_ids = [v["id_validation"] for v in pending]

                    response.success()
                    return True
                else:
                    response.failure("Gagal ambil data validation")
                    return False
            else:
                response.failure("Error API")
                return False

    # ================= APPROVE =================
    def approve_validation(self, validation_id):
        payload = {
            "validation_status": "approved",
            "is_approved": True,
            "validation_notes": "Approved by load test",
            "validated_by": 1
        }

        with self.client.put(
            f"/api/validations/{validation_id}",
            headers=self.get_headers(),
            json=payload,
            name="Validation - Approve",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure("Approve gagal")

    # ================= REJECT =================
    def reject_validation(self, validation_id):
        payload = {
            "validation_status": "rejected",
            "is_approved": False,
            "rejection_reason": "Rejected by load test",
            "validated_by": 1
        }

        with self.client.put(
            f"/api/validations/{validation_id}",
            headers=self.get_headers(),
            json=payload,
            name="Validation - Reject",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure("Reject gagal")

    # ================= TASK =================
    @task
    def validate_items(self):
        if not self.token:
            self.login()
            return

        if not self.get_validations():
            return

        if not self.validation_ids:
            return

        # ambil random validation
        val_id = random.choice(self.validation_ids)

        # 50% approve, 50% reject
        if random.random() < 0.5:
            self.approve_validation(val_id)
        else:
            self.reject_validation(val_id)