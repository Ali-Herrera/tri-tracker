import streamlit as st
from streamlit_gsheets import GSheetsConnection
import pandas as pd
from datetime import datetime

st.set_page_config(page_title="Adaptation Lab", layout="wide")

# --- CONNECT TO GOOGLE SHEETS ---
# Paste your Google Sheet URL here
url = "https://docs.google.com/spreadsheets/d/12zB73yww1IyPSVfhlofLJ4VV7Se-V3iBKd_tnwbRdWM/edit?usp=sharing"
conn = st.connection("gsheets", type=GSheetsConnection)
# This tells Streamlit to ignore the old "empty" version of the sheet
df = conn.read(spreadsheet=url, ttl=0)
# Load existing data
df = conn.read(spreadsheet=url)
df = conn.read(spreadsheet=url, ttl=0)
df['Date'] = pd.to_datetime(df['Date']) # This makes the chart timeline look pretty

st.title("🏊‍♂️🚴‍♂️🏃‍♂️ Adaptation Lab")

# --- DATA ENTRY ---
with st.sidebar:
    st.header("Log Session")
    date = st.date_input("Workout Date", datetime.now())
    discipline = st.selectbox("Discipline", ["Swim", "Bike", "Run"])
    w_type = st.selectbox("Session Type", ["Steady State (Z2)", "Tempo/Sweet Spot", "Intervals"])
    
    avg_hr = st.number_input("Avg Heart Rate", value=140)
    
    if discipline == "Bike":
        val = st.number_input("Avg Power (Watts)", value=200)
        ef = val / avg_hr
    else:
        p_min = st.number_input("Pace Min", value=5)
        p_sec = st.number_input("Pace Sec", value=0)
        total_sec = (p_min * 60) + p_sec
        speed = 1000 / total_sec if total_sec > 0 else 0
        ef = speed / avg_hr

    drift = st.number_input("Decoupling % (if known)", value=0.0)

    if st.button("Save to Google Sheets"):
        # Create new row
        new_data = pd.DataFrame([{
            "Date": str(date),
            "Discipline": discipline,
            "Type": w_type,
            "EF": round(ef, 4),
            "Decoupling": drift
        }])
        
        # Add to existing data and update sheet
        updated_df = pd.concat([df, new_data], ignore_index=True)
        conn.update(spreadsheet=url, data=updated_df)
        st.success("Synced to Google Sheets!")
        st.rerun()

# --- DASHBOARD ---
st.divider()

if not df.empty:
    # 1. Grab the most recent session data
    latest_session = df.iloc[-1]
    latest_drift = latest_session['Decoupling']
    latest_ef = latest_session['EF']
    
    # 2. Status Traffic Light Logic
    st.subheader("🚀 Coach's Recommendation")
    
    col_a, col_b = st.columns([1, 3])
    
    with col_a:
        if latest_drift <= 5.0:
            st.title("🟢")
            status = "GREEN LIGHT"
        elif latest_drift <= 10.0:
            st.title("🟡")
            status = "CAUTION"
        else:
            st.title("🔴")
            status = "RED LIGHT"
            
    with col_b:
        st.metric("Latest Decoupling", f"{latest_drift}%", delta="- Stable" if latest_drift <= 5 else "+ Drifting")
        
        if status == "GREEN LIGHT":
            st.write(f"**Action:** Your aerobic engine is stable at this load. You've earned a **10-15% increase** in duration or a small intensity jump.")
        elif status == "CAUTION":
            st.write(f"**Action:** You're adapting, but your heart rate is still drifting. **Hold** this current volume for 1-2 more sessions.")
        else:
            st.write(f"**Action:** High cardiac drift detected. This load is currently too high. **Back off** duration or intensity to recover.")

    # 3. Trends Tabs
    tab1, tab2 = st.tabs(["📈 Efficiency Trends", "🧮 Manual Calculator"])
    
    with tab1:
        steady_df = df[df['Type'] == "Steady State (Z2)"]
        if not steady_df.empty:
            st.line_chart(steady_df, x="Date", y="EF", color="Discipline")
        else:
            st.info("Log a 'Steady State (Z2)' session to see your fitness trend.")

else:
    st.info("Awaiting your first workout log to provide recommendations.")
