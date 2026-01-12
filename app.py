import streamlit as st
import pandas as pd
import plotly.express as px
import requests
from datetime import datetime

# --- CONFIG ---
st.set_page_config(page_title="Tri-Base Builder", layout="wide")

# REPLACE THIS with your ID
SHEET_ID = "184l-kXElCBotL4dv0lzyH1_uzQTtZuFkM5obZtsewBQ" 
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv"

# --- DATA LOADING ---
def load_data():
    try:
        data = pd.read_csv(SHEET_URL)
        # Ensure Date is actually a date
        if not data.empty:
            data['Date'] = pd.to_datetime(data['Date'])
        return data
    except Exception as e:
        st.error(f"Connection Error: {e}")
        return pd.DataFrame()

df = load_data()

# --- SIDEBAR ---
st.sidebar.header("Log Session")
date = st.sidebar.date_input("Date", datetime.now())
sport = st.sidebar.selectbox("Sport", ["Swim", "Bike", "Run", "Strength"])
duration = st.sidebar.number_input("Duration (mins)", min_value=1, step=5)
distance = st.sidebar.number_input("Distance", min_value=0.0, step=0.1)
intensity = st.sidebar.slider("Intensity", 1, 10, 5)

if st.sidebar.button("Save to Google Sheets"):
    SCRIPT_URL = "YOUR_APPS_SCRIPT_URL_HERE"
    params = {
        "date": date.strftime("%Y-%m-%d"),
        "sport": sport,
        "duration": duration,
        "distance": distance,
        "intensity": intensity,
        "load": duration * intensity
    }
    try:
        # Use a timeout so the app doesn't hang forever
        res = requests.get(SCRIPT_URL, params=params, timeout=10)
        st.sidebar.success("Saved!")
        st.rerun()
    except:
        st.sidebar.error("Could not connect to Google Script.")

# --- DASHBOARD ---
st.title("🏊‍♂️ My Training Dashboard")

if df is not None and not df.empty:
    st.write("Current Training Load")
    # (Your chart code goes here)
    st.dataframe(df)
else:
    st.warning("No data found. Please log a workout in the sidebar or check your Google Sheet ID.")
