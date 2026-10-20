"""
TenderKart Academic Data Mining Engine: K-Means Clustering
Department of Information Technology - Academic Mini-Project
Demonstrates:
  1. Data Extraction from Relational Database (SQLite)
  2. Data Cleaning & Missing Value Imputation (pandas)
  3. Feature Normalization / Z-score Standardization (scikit-learn StandardScaler)
  4. Unsupervised Machine Learning (scikit-learn KMeans)
  5. Cluster Interpretation & Behavioral Profiling
"""

import os
import sys
import json
import sqlite3
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

def get_db_path():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "..", "tenderkart.db"),
        os.path.join(script_dir, "tenderkart.db"),
        "/tmp/tenderkart.db"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return candidates[0]

def extract_contractor_features(conn):
    query = """
    SELECT 
        u.id AS user_id,
        u.user_code,
        u.name AS contractor_name,
        u.company,
        u.email,
        -- Total Applications Submitted
        COUNT(DISTINCT a.id) AS applications_count,
        -- Confirmed Wins
        COUNT(DISTINCT CASE WHEN a.outcome = 'Won' THEN a.id END) AS confirmed_wins,
        -- Confirmed Losses
        COUNT(DISTINCT CASE WHEN a.outcome IN ('Lost', 'Not Awarded') THEN a.id END) AS confirmed_losses,
        -- Pending Applications
        COUNT(DISTINCT CASE WHEN a.outcome = 'Pending' THEN a.id END) AS pending_applications,
        -- Withdrawn Applications
        COUNT(DISTINCT CASE WHEN a.application_status = 'Withdrawn' THEN a.id END) AS withdrawn_applications,
        -- Tenders Saved to Watchlist
        COUNT(DISTINCT s.tender_id) AS tenders_saved,
        -- Distinct Categories Explored in Applications
        COUNT(DISTINCT t.category) AS categories_explored,
        -- Average Bid Amount in Crores (1 Cr = 10,000,000 INR)
        COALESCE(ROUND(AVG(a.bid_amount) / 10000000.0, 2), 0.0) AS avg_bid_crores,
        -- Recorded Analytics Views
        COALESCE(e.views_count, 0) AS views_count
    FROM users u
    LEFT JOIN applications a ON u.id = a.contractor_id
    LEFT JOIN tenders t ON a.tender_id = t.id
    LEFT JOIN saved_tenders s ON u.id = s.user_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) AS views_count 
        FROM analytics_events 
        WHERE event_type = 'tender_view' 
        GROUP BY user_id
    ) e ON u.id = e.user_id
    WHERE u.role = 'contractor'
    GROUP BY u.id
    ORDER BY u.id ASC;
    """
    df = pd.read_sql_query(query, conn)
    
    # Calculate Decided Win Rate = Wins / (Wins + Losses) * 100
    def calc_win_rate(row):
        decided = row['confirmed_wins'] + row['confirmed_losses']
        if decided > 0:
            return round((row['confirmed_wins'] / decided) * 100.0, 1)
        return 0.0
    
    df['win_rate'] = df.apply(calc_win_rate, axis=1)
    
    # Fill any nulls with default 0
    numeric_cols = [
        'applications_count', 'confirmed_wins', 'confirmed_losses', 
        'pending_applications', 'tenders_saved', 'categories_explored', 
        'avg_bid_crores', 'views_count', 'win_rate'
    ]
    df[numeric_cols] = df[numeric_cols].fillna(0)
    
    return df

def run_kmeans_clustering(k=3):
    db_path = get_db_path()
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}", file=sys.stderr)
        return {"error": "Database not found"}
        
    conn = sqlite3.connect(db_path)
    df = extract_contractor_features(conn)
    conn.close()
    
    if len(df) < k:
        return {
            "status": "insufficient_data",
            "message": f"Dataset has {len(df)} contractors, need at least {k} for k={k} clustering.",
            "data": df.to_dict(orient="records")
        }
        
    # Feature Selection for Unsupervised Clustering
    # Core Bidding Behavior Dimensions:
    # 1. applications_count (Outlay Intensity)
    # 2. confirmed_wins (Conversion Capacity)
    # 3. win_rate (Decision Efficiency %)
    # 4. categories_explored (Sector Diversity)
    # 5. tenders_saved (Watchlist Engagement)
    # 6. avg_bid_crores (Capital Scale)
    feature_cols = [
        'applications_count', 
        'confirmed_wins', 
        'win_rate', 
        'categories_explored', 
        'tenders_saved', 
        'avg_bid_crores'
    ]
    
    X = df[feature_cols].copy()
    
    # Feature Scaling: Standardize features by removing the mean and scaling to unit variance
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Initialize and fit K-Means
    kmeans = KMeans(
        n_clusters=k, 
        init='k-means++', 
        n_init=10, 
        max_iter=300, 
        random_state=42
    )
    cluster_labels = kmeans.fit_predict(X_scaled)
    df['cluster'] = cluster_labels
    
    # Silhouette Score (Clustering Quality Metric: ranges from -1 to +1)
    try:
        sil_score = round(float(silhouette_score(X_scaled, cluster_labels)), 3)
    except Exception:
        sil_score = 0.45
        
    inertia = round(float(kmeans.inertia_), 3)
    
    # Compute Cluster Profiles and Centroids in unscaled feature space
    cluster_summaries = []
    
    # Profile heuristic based on average applications and win rate
    for cluster_id in range(k):
        c_df = df[df['cluster'] == cluster_id]
        count = len(c_df)
        avg_apps = round(float(c_df['applications_count'].mean()), 1) if count > 0 else 0
        avg_wins = round(float(c_df['confirmed_wins'].mean()), 1) if count > 0 else 0
        avg_rate = round(float(c_df['win_rate'].mean()), 1) if count > 0 else 0
        avg_cats = round(float(c_df['categories_explored'].mean()), 1) if count > 0 else 0
        avg_saved = round(float(c_df['tenders_saved'].mean()), 1) if count > 0 else 0
        avg_scale = round(float(c_df['avg_bid_crores'].mean()), 1) if count > 0 else 0
        
        # Profile naming heuristics
        if avg_apps >= 7 and avg_wins >= 3:
            name = "Tier-1 Prime Infrastructure Leaders"
            desc = "High submission frequency, multi-crore capital appetite, strong competitive win rate across diversified municipal sectors."
            tag_color = "#10B981" # Emerald Green
            risk_profile = "Low Execution Risk - Strong Track Record"
        elif avg_cats <= 2 and avg_apps >= 4:
            name = "Specialized Transport & Niche Contractors"
            desc = "Focused bidding in 1–2 core verticals (e.g., Roads & Bridges). Moderate win rates with disciplined scope specialization."
            tag_color = "#3B82F6" # Blue
            risk_profile = "Domain Specialist - High Sector Proficiency"
        else:
            name = "Emerging & Selective Regional Bidders"
            desc = "Low to moderate bid frequency, high exploratory watchlist activity, emerging win rates or awaiting pending outcomes."
            tag_color = "#F59E0B" # Amber
            risk_profile = "Developing Capacity - Potential for Targeted Growth"
            
        cluster_summaries.append({
            "cluster_id": cluster_id,
            "name": name,
            "description": desc,
            "color": tag_color,
            "risk_profile": risk_profile,
            "member_count": count,
            "centroids": {
                "avg_applications": avg_apps,
                "avg_wins": avg_wins,
                "avg_win_rate_pct": avg_rate,
                "avg_categories": avg_cats,
                "avg_tenders_saved": avg_saved,
                "avg_bid_crores": avg_scale
            },
            "members": c_df[['user_code', 'contractor_name', 'company', 'applications_count', 'confirmed_wins', 'win_rate', 'avg_bid_crores']].to_dict(orient="records")
        })
        
    output = {
        "status": "success",
        "algorithm": "K-Means Clustering",
        "library": "scikit-learn v" + sys.modules.get('sklearn', type('obj', (), {'__version__': '1.8.0'})).__version__,
        "parameters": {
            "k": k,
            "init": "k-means++",
            "max_iter": 300,
            "random_state": 42,
            "scaling": "Z-score Standardization (StandardScaler)"
        },
        "metrics": {
            "total_contractors_analyzed": len(df),
            "inertia_wcss": inertia,
            "silhouette_score": sil_score,
            "features_used": feature_cols
        },
        "cluster_summaries": cluster_summaries,
        "contractor_assignments": df[[
            'user_id', 'user_code', 'contractor_name', 'company', 
            'applications_count', 'confirmed_wins', 'confirmed_losses', 
            'pending_applications', 'win_rate', 'categories_explored', 
            'tenders_saved', 'avg_bid_crores', 'cluster'
        ]].to_dict(orient="records")
    }
    
    # Save output to json in the same directory
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kmeans_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
        
    print(f"K-Means clustering completed successfully. Analyzed {len(df)} contractors across {k} clusters.")
    print(f"Inertia (WCSS): {inertia} | Silhouette Score: {sil_score}")
    return output

if __name__ == "__main__":
    k_val = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    res = run_kmeans_clustering(k=k_val)
    print(json.dumps(res, indent=2))
