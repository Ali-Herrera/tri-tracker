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
    # Separate the 'Work' from the 'Recovery'
steady_state_df = df[df['Type'] == "Steady State (Post-Intervals)"]
recovery_df = df[df['Type'] == "Pure Aerobic (Recovery)"]

# Calculate your 'Baseline Recovery EF' (Average of all recovery rides)
if not recovery_df.empty:
    avg_recovery_ef = recovery_df['EF'].mean()
    latest_recovery_ef = recovery_df['EF'].iloc[-1]
    
    # If your latest recovery is much worse than your average, show a warning
    if latest_recovery_ef < (avg_recovery_ef * 0.95):
        st.warning("⚠️ Fatigue Alert: Your recovery efficiency is lower than usual. Consider an extra rest day.")
    discipline = st.selectbox("Discipline", ["Swim", "Bike", "Run"])
    # --- SIDEBAR INPUTS ---
st.sidebar.header("Log New Session")

workout_options = [
    "Steady State (Post-Intervals)", 
    "Progressive Build (Ride 6)", 
    "Pure Aerobic (Recovery)",
    "Other"
]
type_selection = st.sidebar.selectbox("Workout Category", options=workout_options)

# --- RECOVERY MONITORING LOGIC ---
# Place this after you've defined 'df' (the part where you read from Google Sheets)
if not df.empty:
    recovery_df = df[df['Type'] == "Pure Aerobic (Recovery)"]
    
    if not recovery_df.empty:
        st.subheader("🔋 Recovery & Freshness")
        latest_rec = recovery_df.iloc[-1]
        
        # We compare the latest recovery EF to the average of previous ones
        avg_rec_ef = recovery_df['EF'].mean()
        efficiency_drop = (latest_rec['EF'] / avg_rec_ef) - 1
        
        col1, col2 = st.columns(2)
        col1.metric("Recovery EF", f"{latest_rec['EF']:.2f}", f"{efficiency_drop:.1%}")
        
        if efficiency_drop < -0.05:
            col2.error("🚨 System Fatigued: Efficiency is significantly down. Prioritize sleep.")
        else:
            col2.success("✅ System Ready: Recovery metrics are stable.")

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
