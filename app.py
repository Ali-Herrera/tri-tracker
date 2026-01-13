import streamlit as st
import pandas as pd
import plotly.express as px
import requests
from datetime import datetime

# --- 1. CONFIG (PASTE YOUR KEYS HERE) ---
SHEET_ID = "184l-kXElCBotL4dv0lzyH1_uzQTtZuFkM5obZtsewBQ" 
SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyZC6mjNrzRn9OnYEMHcSKQvaW7a8fdEd18aytaFIDx_ZmNRhGssb2bZwGX3_M1FxY1/exec"

# Connection string for reading
SHEET_URL = f"https://docs.google.com/spreadsheets/d/184l-kXElCBotL4dv0lzyH1_uzQTtZuFkM5obZtsewBQ/export?format=csv"

st.set_page_config(page_title="Triathlon Training Hub", layout="wide")

# --- 2. DATA LOADING ---
def load_data():
    try:
        # Cache buster to ensure we get the latest Google Sheet data
        data = pd.read_csv(f"{SHEET_URL}&cache={datetime.now().timestamp()}")
        if not data.empty:
            data['Date'] = pd.to_datetime(data['Date'])
            data = data.sort_values('Date', ascending=False)
        return data
    except:
        return pd.DataFrame()

df = load_data()

# --- 3. SIDEBAR ---
st.sidebar.header("Log Workout")
date_in = st.sidebar.date_input("Date", datetime.now())
sport_in = st.sidebar.selectbox("Sport", ["Swim", "Bike", "Run", "Strength"])
dur_in = st.sidebar.number_input("Duration (mins)", min_value=1, step=5)
dist_in = st.sidebar.number_input("Distance", min_value=0.0, step=0.1)
int_in = st.sidebar.slider("Intensity (1-10)", 1, 10, 5)

if st.sidebar.button("🚀 Log to Google Sheets"):
    params = {
        "date": date_in.strftime("%Y-%m-%d"),
        "sport": sport_in,
        "duration": dur_in,
        "distance": dist_in,
        "intensity": int_in,
        "load": dur_in * int_in
    }
    try:
        requests.get(SCRIPT_URL, params=params, timeout=5)
        st.sidebar.success("Workout Recorded!")
        st.rerun()
    except:
        st.sidebar.warning("Syncing... Refresh in a moment.")

# --- 4. DASHBOARD ---
st.title("🏊‍♂️ My Training Dashboard")

# --- NEW: COACH'S ANALYSIS SECTION ---
if not df.empty:
    st.subheader("📋 Coach's Analysis")
    # Group by week (Monday start)
    df_sorted = df.sort_values('Date')
    weekly = df_sorted.groupby(pd.Grouper(key='Date', freq='W-MON')).sum(numeric_only=True).reset_index()
    
    if len(weekly) > 1:
        this_week = weekly.iloc[-1]['Load']
        last_week = weekly.iloc[-2]['Load']
        
        # Calculate percent change in training stress
        increase = ((this_week - last_week) / last_week) * 100 if last_week > 0 else 0

        if increase > 25:
            st.error(f"🚨 **DANGER ZONE:** Your load jumped {int(increase)}% this week. This is a massive spike!")
            st.warning("👉 **ACTION:** Mandatory Deload recommended. Cut volume by 40% next week to avoid injury.")
        elif increase > 15:
            st.warning(f"⚠️ **PUSHING HARD:** Load increased by {int(increase)}%.")
            st.info("👉 **ACTION:** Hold steady next week. Do not increase volume further yet.")
        elif increase < -20:
            st.success("🧊 **RECOVERY PHASE:** You are deloading. This is where the fitness gains actually 'lock in'.")
        else:
            st.success(f"✅ **STEET SPOT:** Steady {int(increase)}% change. Perfect progression.")
    else:
        st.info("Log data for two different weeks to enable trend analysis.")

    # --- METRICS AND CHARTS ---
    col1, col2, col3 = st.columns(3)
    total_hrs = round(df['Duration'].sum() / 60, 1)
    total_sessions = len(df)
    avg_intensity = round(df['Intensity'].mean(), 1)
    
    col1.metric("Total Time", f"{total_hrs} Hours")
    col2.metric("Sessions", total_sessions)
    col3.metric("Avg Intensity", f"{avg_intensity}/10")

    # Load Chart
    st.subheader("Weekly Training Load")
    fig = px.bar(weekly, x='Date', y='Load', color_discrete_sequence=['#00CC96'])
    st.plotly_chart(fig, use_container_width=True)

    # Discipline Split
    st.subheader("Discipline Breakdown")
    sport_df = df.groupby('Sport')['Duration'].sum().reset_index()
    fig_pie = px.pie(sport_df, values='Duration', names='Sport', hole=0.4)
    st.plotly_chart(fig_pie, use_container_width=True)

    # Activity Table
    st.subheader("Recent Activity")
    st.dataframe(df[['Date', 'Sport', 'Duration', 'Distance', 'Load']], use_container_width=True)
else:
    st.info("No data found. Start logging to see your coaching feedback!")
