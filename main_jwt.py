from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
from dotenv import load_dotenv
from pydantic import BaseModel

# ===== INIT =====
appjwt = FastAPI(title="FastAPI + Supabase + JWT")
app = appjwt
security = HTTPBearer()

# ===== CORS MIDDLEWARE =====
appjwt.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== LOAD ENV =====
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
TABLE = os.getenv("TABLE")

BASE_URL = f"{SUPABASE_URL}/rest/v1/{TABLE}"

# ===== MODELS =====
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class Mahasiswa(BaseModel):
    nama: str
    nim: str
    jurusan: str


# ===== HELPER =====
def safe_json(response):
    try:
        if response.text:
            return response.json()
        return {"message": "success"}
    except:
        return {"raw": response.text}


def get_next_mahasiswa_id(headers):
    r = requests.get(
        f"{BASE_URL}?select=id&order=id.desc&limit=1",
        headers=headers
    )

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)

    rows = safe_json(r)
    if not rows:
        return 1

    return int(rows[0]["id"]) + 1


# ===== VERIFY TOKEN (VALIDASI KE SUPABASE) =====
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    r = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {token}"
        }
    )

    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Token tidak valid")

    return token


# ===== LOGIN =====
@appjwt.post("/login")
def login(data: LoginRequest):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"

    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }

    r = requests.post(url, headers=headers, json=data.dict())

    if r.status_code != 200:
        raise HTTPException(status_code=401, detail=r.text)

    return r.json()


# ===== REGISTER =====
@appjwt.post("/register")
def register(data: RegisterRequest):
    url = f"{SUPABASE_URL}/auth/v1/signup"

    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "email": data.email,
        "password": data.password,
        "options": {
            "data": {
                "name": data.name
            }
        }
    }

    r = requests.post(url, headers=headers, json=payload)

    if r.status_code not in [200, 201]:
        raise HTTPException(status_code=400, detail=r.text)

    # Automatically login after registration
    login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    login_payload = {
        "email": data.email,
        "password": data.password
    }
    login_res = requests.post(login_url, headers=headers, json=login_payload)
    if login_res.status_code == 200:
        return login_res.json()

    return r.json()


# ===== GET CURRENT USER (PROTECTED) =====
@appjwt.get("/me")
def get_me(token=Depends(verify_token)):
    r = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {token}"
        }
    )

    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Token tidak valid")

    user_data = r.json()
    return {
        "success": True,
        "data": {
            "id": user_data.get("id"),
            "email": user_data.get("email"),
            "name": user_data.get("user_metadata", {}).get("name") or user_data.get("email").split("@")[0]
        }
    }


# ===== GET MAHASISWA =====
@appjwt.get("/mahasiswa")
def get_data(token=Depends(verify_token)):
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token}"
    }

    r = requests.get(BASE_URL, headers=headers)

    return safe_json(r)


# ===== INSERT MAHASISWA =====
@appjwt.post("/mahasiswa")
def create_data(data: Mahasiswa, token=Depends(verify_token)):
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    payload = data.dict()
    payload["id"] = get_next_mahasiswa_id(headers)

    r = requests.post(BASE_URL, headers=headers, json=payload)

    return safe_json(r)


# ===== UPDATE MAHASISWA =====
@appjwt.put("/mahasiswa/{id}")
def update_data(id: str, data: Mahasiswa, token=Depends(verify_token)):
    url = f"{BASE_URL}?id=eq.{id}"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    r = requests.patch(url, headers=headers, json=data.dict())

    return safe_json(r)


# ===== DELETE MAHASISWA =====
@appjwt.delete("/mahasiswa/{id}")
def delete_data(id: str, token=Depends(verify_token)):
    url = f"{BASE_URL}?id=eq.{id}"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token}"
    }

    r = requests.delete(url, headers=headers)

    return safe_json(r)
