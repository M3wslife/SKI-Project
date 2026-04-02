import requests
import json

WFM_URL = 'https://open-api.dataslot.app/search/wfm/v1/SKi'
payload = {
    "hitsPerPage": 1,
    "page": 1,
    "filter": [
        "workflowId = INVOICE",
        "type = TASK"
    ],
    "sort": ["timestamp:desc"]
}

try:
    response = requests.post(WFM_URL, json=payload, headers={'Content-Type': 'application/json', 'Accept': 'application/json'})
    if response.status_code == 200:
        data = response.json()
        hits = data.get('hits', [])
        if hits:
            # Mask sensitive info if any, but mostly I need the keys
            print(json.dumps(hits[0], indent=2))
        else:
            print("No hits found.")
    else:
        print(f"Error {response.status_code}: {response.text}")
except Exception as e:
    print(f"Connection error: {e}")
