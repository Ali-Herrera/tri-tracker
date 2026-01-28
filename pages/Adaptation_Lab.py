import streamlit as st
import pandas as pd
import os
from datetime import datetime

# --- CONFIG & STYLING ---
st.set_page_config(page_title="Triathlon Adaptation Lab", layout="wide")
DATA_FILE = "triathlon_efficiency.csv"

def load_data():
    if os.path.exists(DATA_FILE):
        return pd.read_csv(DATA_FILE)
    return pd.DataFrame(columns=["Date", "Discipline", "Type", "EF", "Decoupling"])

# --- APP HEADER ---
st.title("🏊‍♂️🚴‍♂️🏃‍♂️ Adaptation Lab")
st.markdown("Track your **Efficiency Factor** and **Aerobic Decoupling** to know when to level up.")

# --- SIDEBAR: DATA ENTRY ---
with st.sidebar:
    st.header("Log Session")
    date = st.date_input("Workout Date", datetime.now())
    discipline = st.selectbox("Discipline", ["Swim", "Bike", "Run"])
    w_type = st.selectbox("Session Type", ["Steady State (Z2)", "Tempo/Sweet Spot", "Intervals"])
    
    st.divider()
    
    # EF Logic
    avg_hr = st.number_input("Avg Heart Rate", value=140)
    
    if discipline == "Bike":
        val = st.number_input("Avg Power (Watts)", value=200)
        ef = val / avg_hr
    else:
        # For Swim/Run, we convert Pace to Speed (m/s)
        p_min = st.number_input("Pace Min", value=5)
        p_sec = st.number_input("Pace Sec", value=0)
        total_sec = (p_min * 60) + p_sec
        speed = 1000 / total_sec if total_sec > 0 else 0
        ef = speed / avg_hr

    # Decoupling Input
    st.subheader("Decoupling (Optional)")
    drift = st.number_input("Calculated Drift % (if known)", value=0.0, step=0.1)

    if st.button("Save Workout"):
        new_row = pd.DataFrame([[date, discipline, w_type, round(ef, 4), drift]], 
                               columns=["Date", "Discipline", "Type", "EF", "Decoupling"])
        new_row.to_csv(DATA_FILE, mode='a', header=not os.path.exists(DATA_FILE), index=False)
        st.success("Entry Saved!")
        st.rerun()

# --- MAIN DASHBOARD ---
df = load_data()

if not df.empty:
    df['Date'] = pd.to_datetime(df['Date'])
    
    # Filter only for Steady State to show the "True" adaptation trend
    steady_df = df[df['Type'] == "Steady State (Z2)"]

    tab1, tab2 = st.tabs(["Efficiency Trends", "Decoupling Calculator"])

    with tab1:
        st.subheader("Aerobic Efficiency Factor (EF) Trend")
        st.caption("Showing 'Steady State' sessions only for accurate adaptation tracking.")
        
        if not steady_df.empty:
            # We use a line chart to show the trend over time
            st.line_chart(steady_df, x="Date", y="EF", color="Discipline")
        else:
            st.info("Log some 'Steady State' sessions to see your trend!")

    with tab2:
        st.subheader("Is it time to increase the load?")
        # Re-using our logic from before for a quick check
        c1, c2 = st.columns(2)
        with c1:
            h1_ef = st.number_input("1st Half EF", value=1.40)
        with c2:
            h2_ef = st.number_input("2nd Half EF", value=1.35)
        
        calc_drift = ((h1_ef - h2_ef) / h1_ef) * 100
        
        if calc_drift < 5.0:
            st.success(f"**Drift: {calc_drift:.1f}%** - Aerobically Stable. You've adapted!")
        else:
            st.warning(f"**Drift: {calc_drift:.1f}%** - Still Adapting. Keep current volume.")

else:
    st.info("Waiting for your first workout entry...")
