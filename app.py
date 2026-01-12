import streamlit as st
import pandas as pd
import plotly.express as px
import requests
from datetime import datetime

# --- 1. CONFIG (Check these two carefully!) ---
SHEET_ID = "184l-kXElCBotL4dv0lzyH1_uzQTtZuFkM5obZtsewBQ" 
SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_URL_HERE"

# These build the connection strings
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv"

st.set_page_config(page_title="Tri-Base Builder", layout="wide")

# --- 2. DATA LOADING ---
def load_data():
    try:
        # We use a trick to force Google to give us the latest data
        data = pd.read_csv(SHEET_URL)
        if not data.empty:
            data['Date'] = pd.to_datetime(data['Date'])
        return data
    except Exception as e:
        # This helps us see if the ID is the problem
        st.error(f"⚠️ Connection Error: Please check your Sheet ID. (Technical error: {e})")
        return pd.DataFrame()

df = load_data()

# --- 3. SIDEBAR (The Input Form) ---
st.sidebar.header("Log New Session")
date_input = st.sidebar.date_input("Date", datetime.now())
sport_input = st.sidebar.selectbox("Sport", ["Swim", "Bike", "Run", "Strength"])
duration_input = st.sidebar.number_input("Duration (mins)", min_value=1, step=5)
distance_input = st.sidebar.number_input("Distance", min_value=0.0, step=0.1)
intensity_input = st.sidebar.slider("Intensity (1-10)", 1, 10, 5)

# THE BIG LOG BUTTON
if st.sidebar.button("🚀 Log Workout"):
    if SHEET_ID == "PASTE_YOUR_ID_HERE" or SCRIPT_URL == "PASTE_YOUR_APPS_SCRIPT_URL_HERE":
        st.sidebar.error("Setup incomplete: Add your IDs to the code on GitHub!")
    else:
        params = {
            "date": date_input.strftime("%Y-%m-%d"),
            "sport": sport_input,
            "duration": duration_input,
            "distance": distance_input,
            "intensity": intensity_input,
            "load": duration_input * intensity_input
        }
        try:
            res = requests.get(SCRIPT_URL, params=params, timeout=10)
            st.sidebar.success("Logged to Google Sheets!")
            st.rerun() # This refreshes the app to show the new data
        except:
            st.sidebar.error("App couldn't talk to Google. Check your Apps Script URL.")

# --- 4. DASHBOARD DISPLAY ---
st.title("🏊‍♂️ My Training Dashboard")

if not df.empty:
    # Quick Stats
    st.subheader("Total Volume")
    fig = px.area(df.sort_values('Date'), x='Date', y='Duration', color='Sport')
    st.plotly_chart(fig, use_container_width=True)
    
    # Raw Data
    st.subheader("History")
    st.dataframe(df.sort_values('Date', ascending=False), use_container_width=True)
else:
    st.info("No data found yet. Try logging your first workout in the sidebar!")
