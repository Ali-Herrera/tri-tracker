import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime

# --- CONFIG ---
st.set_page_config(page_title="Tri-Base Google Edition", layout="wide")

# REPLACE THIS with your actual Google Sheet URL
SHEET_ID = "184l-kXElCBotL4dv0lzyH1_uzQTtZuFkM5obZtsewBQ/edit?gid=0#gid=0" 
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv"
# For SAVING data, we use a slightly different link format
EXPORT_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"

# --- DATA LOADING ---
def load_data():
    try:
        # This reads the Google Sheet live
        return pd.read_csv(SHEET_URL)
    except:
        return pd.DataFrame(columns=["Date", "Sport", "Duration", "Distance", "Intensity", "Load"])

df = load_data()

# --- SIDEBAR ---
st.sidebar.header("Log Session")
# ... (Keep the same input fields as before) ...

import requests # Add this at the very top of your file!

# ... inside the sidebar logic ...
if st.sidebar.button("Save to Google Sheets"):
    # Replace the URL below with your Apps Script URL
    SCRIPT_URL = "YOUR_APPS_SCRIPT_URL_HERE"
    
    params = {
        "date": date,
        "sport": sport,
        "duration": duration,
        "distance": distance,
        "intensity": intensity,
        "load": duration * intensity
    }
    
    response = requests.get(SCRIPT_URL, params=params)
    if response.status_code == 200:
        st.sidebar.success("Saved to Google Sheets!")
        st.rerun()
    else:
        st.sidebar.error("Error saving data.")
