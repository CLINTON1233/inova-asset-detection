from locust import HttpUser, task, between

class LoginUser(HttpUser):
    host = "http://localhost:5001"
    wait_time = between(1, 2)

    @task
    def login(self):
        with self.client.post(
            "/api/login",
            json={
                "email": "clintonalfaro664@gmail.com",
                "password": "Sumaterapos123"
            },
            name="Login Endpoint",
            catch_response=True
        ) as response:

            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("success") is True:
                        response.success()
                    else:
                        response.failure("Response success = false")
                except Exception as e:
                    response.failure(f"JSON parse error: {str(e)}")
            else:
                response.failure(f"Status code error: {response.status_code}")