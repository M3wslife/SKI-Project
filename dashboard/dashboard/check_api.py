import requests

url = "http://localhost:3000/api/pl?year=2026"
try:
    r = requests.get(url)
    data = r.json()
    itemChannels = data.get('itemChannels', [])
    print(f"Item Channels Count: {len(itemChannels)}")
    for item in itemChannels:
        print(f"  {item}")
except Exception as e:
    print(f"Error: {e}")
