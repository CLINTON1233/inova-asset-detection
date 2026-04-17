import base64

with open("test_images/serial.jpg", "rb") as f:
    encoded = base64.b64encode(f.read()).decode("utf-8")

with open("output_base64.txt", "w") as f:
    f.write("data:image/jpeg;base64," + encoded)

print("✅ Base64 saved to output_base64.txt")