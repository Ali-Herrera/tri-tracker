import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta

st.set_page_config(page_title="Tri-Coach v1.1", layout="wide")

# --- DATA STORAGE ---
DATA_FILE = "training_log.csv"

try:
    df = pd.read_csv(DATA_FILE)
    df['Date'] = pd.to_datetime(df['Date'])
except FileNotFoundError:
    df = pd.DataFrame(columns=["Date", "Sport", "Duration", "Intensity", "Load"])

# --- SIDEBAR ---
st.sidebar.header("Log Session")
date = st.sidebar.date_input("Date", datetime.now())
sport = st.sidebar.selectbox("Sport", ["Swim", "Bike", "Run", "Strength"])
duration = st.sidebar.number_input("Duration (mins)", min_value=0, step=5)
intensity = st.sidebar.slider("Intensity (1=Easy, 10=Max)", 1, 10, 5)

if st.sidebar.button("Save Workout"):
    # Calculate Load (Duration * Intensity)
    load = duration * intensity
    new_row = pd.DataFrame([[pd.to_datetime(date), sport, duration, intensity, load]], 
                            columns=["Date", "Sport", "Duration", "Intensity", "Load"])
    df = pd.concat([df, new_row], ignore_index=True)
    df.to_csv(DATA_FILE, index=False)
    st.rerun()

# --- DASHBOARD ---
st.title("🏊‍♂️ My Triathlon Training")

if not df.empty:
    # Logic: Group by week
    df = df.sort_values('Date')
    weekly = df.groupby(pd.Grouper(key='Date', freq='W-MON')).sum(numeric_only=True).reset_index()
    
    # KPIs
    col1, col2, col3 = st.columns(3)
    current_vol = weekly.iloc[-1]['Duration']
    current_load = weekly.iloc[-1]['Load']
    
    col1.metric("Weekly Volume", f"{current_vol} min")
    col2.metric("Weekly Load Score", f"{int(current_load)}")
    
    # Coach Logic
    st.subheader("📋 Coach's Guidance")
    if len(weekly) > 1:
        prev_load = weekly.iloc[-2]['Load']
        diff = ((current_load - prev_load) / prev_load) * 100 if prev_load > 0 else 0
        
        if len(weekly) % 4 == 0:
            st.warning("🚨 **TIME TO DELOAD.** You've pushed for 3 weeks. Cut your volume by 30% this week to recover.")
        elif diff > 15:
            st.error(f"⚠️ **LOAD SPIKE!** Your intensity/volume jumped {diff:.1f}%. Risk of injury is high. Scale back tomorrow.")
        else:
            st.success("✅ **STAY THE COURSE.** Your progression is safe and steady.")

    # Chart
    st.subheader("Training Load Trend")
    fig = px.bar(weekly, x='Date', y='Load', title="Weekly Training Stress", color_discrete_sequence=['#00CC96'])
    st.plotly_chart(fig, use_container_width=True)

else:
    st.info("Log your first workout in the sidebar to see the magic happen!")
