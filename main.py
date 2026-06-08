# ===== IMPORT =====
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

# ===== LOAD ENV =====
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
TABLE = os.getenv("TABLE")

BASE_URL = f"{SUPABASE_URL}/rest/v1/{TABLE}"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# ===== INIT APP =====
app = FastAPI(title="API Mahasiswa Supabase")

# ===== MODEL =====
class Mahasiswa(BaseModel):
    nama: str
    nim: str
    jurusan: str

# ===== HELPER =====
def safe_response(r):
    try:
        if r.text and r.text.strip():
            return r.json()
        else:
            return {"message": "success"}
    except:
        return {"raw": r.text}


def get_next_mahasiswa_id():
    r = requests.get(f"{BASE_URL}?select=id&order=id.desc&limit=1", headers=headers)

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)

    rows = safe_response(r)
    if not rows:
        return 1

    return int(rows[0]["id"]) + 1


# ===== ROUTES =====

# ROOT
@app.get("/")
def root():
    return {"message": "API berjalan"}

# GET DATA
@app.get("/mahasiswa")
def get_mahasiswa():
    r = requests.get(BASE_URL, headers=headers)

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)

    return safe_response(r)

# INSERT DATA
@app.post("/mahasiswa")
def create_mahasiswa(data: Mahasiswa):
    payload = data.dict()
    payload["id"] = get_next_mahasiswa_id()

    r = requests.post(BASE_URL, headers=headers, json=payload)

    if r.status_code not in [200, 201]:
        raise HTTPException(status_code=r.status_code, detail=r.text)

    return safe_response(r)

# UPDATE DATA
@app.put("/mahasiswa/{id}")
def update_mahasiswa(id: str, data: Mahasiswa):
    url = f"{BASE_URL}?id=eq.{id}"

    r = requests.patch(url, headers=headers, json=data.dict())

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)

    return safe_response(r)

# DELETE DATA
@app.delete("/mahasiswa/{id}")
def delete_mahasiswa(id: str):
    url = f"{BASE_URL}?id=eq.{id}"

    r = requests.delete(url, headers=headers)

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)

    return {"message": "deleted"}
