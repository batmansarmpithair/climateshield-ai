import math
import random
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional

RANDOM_SEED = 42

# 28 States and 8 Union Territories with representative districts across India
INDIAN_REGIONS_MASTER = [
    # 1. Assam (Northeast - High Flood vulnerability)
    {"id": "AS-KAM", "name": "Kamrup (Guwahati)", "state": "Assam", "is_ut": False, "lat": 26.1445, "lon": 91.7362, "pop": 1515000, "vuln": 0.78, "infra": 0.55, "terrain": "Riverine Plains"},
    {"id": "AS-CAC", "name": "Cachar (Silchar)", "state": "Assam", "is_ut": False, "lat": 24.8333, "lon": 92.7789, "pop": 1736000, "vuln": 0.82, "infra": 0.42, "terrain": "Barak Valley"},
    {"id": "AS-DIB", "name": "Dibrugarh", "state": "Assam", "is_ut": False, "lat": 27.4728, "lon": 94.9120, "pop": 1326000, "vuln": 0.75, "infra": 0.50, "terrain": "Upper Assam Floodplain"},
    {"id": "AS-BAR", "name": "Barpeta", "state": "Assam", "is_ut": False, "lat": 26.3211, "lon": 91.0066, "pop": 1693000, "vuln": 0.85, "infra": 0.38, "terrain": "Floodplain"},
    
    # 2. Bihar (Eastern - Severe Flood & Heat)
    {"id": "BR-PAT", "name": "Patna", "state": "Bihar", "is_ut": False, "lat": 25.5941, "lon": 85.1376, "pop": 5838000, "vuln": 0.68, "infra": 0.62, "terrain": "Gangetic Plains"},
    {"id": "BR-KAH", "name": "Katihar", "state": "Bihar", "is_ut": False, "lat": 25.5394, "lon": 87.5714, "pop": 3071000, "vuln": 0.84, "infra": 0.40, "terrain": "Kosi Basin"},
    {"id": "BR-MUZ", "name": "Muzaffarpur", "state": "Bihar", "is_ut": False, "lat": 26.1209, "lon": 85.3647, "pop": 4801000, "vuln": 0.79, "infra": 0.48, "terrain": "North Bihar Floodplain"},
    {"id": "BR-GAY", "name": "Gaya", "state": "Bihar", "is_ut": False, "lat": 24.7914, "lon": 85.0002, "pop": 4391000, "vuln": 0.72, "infra": 0.45, "terrain": "South Bihar Plains"},

    # 3. Rajasthan (Western - Extreme Heat & Drought)
    {"id": "RJ-JAI", "name": "Jaipur", "state": "Rajasthan", "is_ut": False, "lat": 26.9124, "lon": 75.7873, "pop": 6626000, "vuln": 0.52, "infra": 0.72, "terrain": "Semi-Arid Plains"},
    {"id": "RJ-JOD", "name": "Jodhpur", "state": "Rajasthan", "is_ut": False, "lat": 26.2389, "lon": 73.0243, "pop": 3687000, "vuln": 0.76, "infra": 0.58, "terrain": "Thar Desert Margin"},
    {"id": "RJ-BAR", "name": "Barmer", "state": "Rajasthan", "is_ut": False, "lat": 25.7532, "lon": 71.4181, "pop": 2603000, "vuln": 0.88, "infra": 0.39, "terrain": "Arid Desert"},
    {"id": "RJ-BIK", "name": "Bikaner", "state": "Rajasthan", "is_ut": False, "lat": 28.0229, "lon": 73.3119, "pop": 2363000, "vuln": 0.82, "infra": 0.48, "terrain": "Arid Desert"},
    {"id": "RJ-CHU", "name": "Churu", "state": "Rajasthan", "is_ut": False, "lat": 28.2900, "lon": 74.9600, "pop": 2039000, "vuln": 0.80, "infra": 0.44, "terrain": "Thermal Hotspot"},

    # 4. Odisha (Eastern Coastal - Cyclones & Monsoon Surges)
    {"id": "OD-BHI", "name": "Bhubaneswar (Khurdha)", "state": "Odisha", "is_ut": False, "lat": 20.2961, "lon": 85.8245, "pop": 1874000, "vuln": 0.50, "infra": 0.70, "terrain": "Coastal Plains"},
    {"id": "OD-PUR", "name": "Puri", "state": "Odisha", "is_ut": False, "lat": 19.8135, "lon": 85.8312, "pop": 1698000, "vuln": 0.84, "infra": 0.50, "terrain": "Cyclone Coast"},
    {"id": "OD-BAL", "name": "Balasore", "state": "Odisha", "is_ut": False, "lat": 21.4934, "lon": 86.9135, "pop": 2317000, "vuln": 0.86, "infra": 0.46, "terrain": "North Coastal Belt"},
    {"id": "OD-GAN", "name": "Ganjam", "state": "Odisha", "is_ut": False, "lat": 19.3800, "lon": 85.0600, "pop": 3529000, "vuln": 0.81, "infra": 0.48, "terrain": "Southern Bay Coastal"},

    # 5. Gujarat (Western Coastal - Cyclones, Heat, Flood)
    {"id": "GJ-AHM", "name": "Ahmedabad", "state": "Gujarat", "is_ut": False, "lat": 23.0225, "lon": 72.5714, "pop": 7214000, "vuln": 0.48, "infra": 0.78, "terrain": "Urban Plains"},
    {"id": "GJ-KUT", "name": "Kutch (Bhuj)", "state": "Gujarat", "is_ut": False, "lat": 23.2420, "lon": 69.6669, "pop": 2092000, "vuln": 0.80, "infra": 0.52, "terrain": "Coastal Salt Marsh & Desert"},
    {"id": "GJ-SUR", "name": "Surat", "state": "Gujarat", "is_ut": False, "lat": 21.1702, "lon": 72.8311, "pop": 6081000, "vuln": 0.62, "infra": 0.74, "terrain": "Tapi Estuary Floodplain"},
    {"id": "GJ-JAM", "name": "Jamnagar", "state": "Gujarat", "is_ut": False, "lat": 22.4707, "lon": 70.0577, "pop": 2160000, "vuln": 0.72, "infra": 0.60, "terrain": "Kathiawar Coast"},

    # 6. Maharashtra (Central/West - Urban Floods, Drought, Heat)
    {"id": "MH-MUM", "name": "Mumbai", "state": "Maharashtra", "is_ut": False, "lat": 19.0760, "lon": 72.8777, "pop": 12442000, "vuln": 0.65, "infra": 0.82, "terrain": "Coastal Mega-Metropolis"},
    {"id": "MH-PUN", "name": "Pune", "state": "Maharashtra", "is_ut": False, "lat": 18.5204, "lon": 73.8567, "pop": 9429000, "vuln": 0.45, "infra": 0.76, "terrain": "Deccan Plateau"},
    {"id": "MH-NAG", "name": "Nagpur (Vidarbha)", "state": "Maharashtra", "is_ut": False, "lat": 21.1458, "lon": 79.0882, "pop": 4653000, "vuln": 0.73, "infra": 0.62, "terrain": "Central Heat Corridor"},
    {"id": "MH-AUR", "name": "Chhatrapati Sambhajinagar", "state": "Maharashtra", "is_ut": False, "lat": 19.8762, "lon": 75.3433, "pop": 3701000, "vuln": 0.78, "infra": 0.54, "terrain": "Marathwada Drought Zone"},

    # 7. Kerala (Southern - Flash Floods & Landslides)
    {"id": "KL-WAY", "name": "Wayanad", "state": "Kerala", "is_ut": False, "lat": 11.6854, "lon": 76.1320, "pop": 817000, "vuln": 0.88, "infra": 0.52, "terrain": "Western Ghats Mountain"},
    {"id": "KL-EKM", "name": "Ernakulam (Kochi)", "state": "Kerala", "is_ut": False, "lat": 9.9816, "lon": 76.2999, "pop": 3418000, "vuln": 0.64, "infra": 0.75, "terrain": "Coastal Backwaters"},
    {"id": "KL-IDU", "name": "Idukki", "state": "Kerala", "is_ut": False, "lat": 9.8500, "lon": 76.9700, "pop": 1108000, "vuln": 0.86, "infra": 0.48, "terrain": "Highland Watershed"},

    # 8. Tamil Nadu (Southern Coastal - Cyclones, Urban Floods, Heat)
    {"id": "TN-CHE", "name": "Chennai", "state": "Tamil Nadu", "is_ut": False, "lat": 13.0827, "lon": 80.2707, "pop": 8696000, "vuln": 0.60, "infra": 0.80, "terrain": "Coastal Lowland"},
    {"id": "TN-CUD", "name": "Cuddalore", "state": "Tamil Nadu", "is_ut": False, "lat": 11.7480, "lon": 79.7714, "pop": 2605000, "vuln": 0.85, "infra": 0.50, "terrain": "Cyclone & Flood Lowland"},
    {"id": "TN-MAD", "name": "Madurai", "state": "Tamil Nadu", "is_ut": False, "lat": 9.9252, "lon": 78.1198, "pop": 3038000, "vuln": 0.62, "infra": 0.65, "terrain": "Southern Inland Plains"},

    # 9. Andhra Pradesh (South-Eastern Coastal - Cyclones & Drought)
    {"id": "AP-VIZ", "name": "Visakhapatnam", "state": "Andhra Pradesh", "is_ut": False, "lat": 17.6868, "lon": 83.2185, "pop": 4290000, "vuln": 0.68, "infra": 0.72, "terrain": "Eastern Ghats Coastal Strip"},
    {"id": "AP-NEL", "name": "Nellore", "state": "Andhra Pradesh", "is_ut": False, "lat": 14.4426, "lon": 79.9865, "pop": 2963000, "vuln": 0.77, "infra": 0.56, "terrain": "South Coastal Coromandel"},
    {"id": "AP-ANA", "name": "Anantapur", "state": "Andhra Pradesh", "is_ut": False, "lat": 14.6819, "lon": 77.6006, "pop": 4081000, "vuln": 0.83, "infra": 0.48, "terrain": "Rayalaseema Drought Belt"},

    # 10. West Bengal (Eastern - Delta Floods, Cyclones, Heat)
    {"id": "WB-KOL", "name": "Kolkata", "state": "West Bengal", "is_ut": False, "lat": 22.5726, "lon": 88.3639, "pop": 4496000, "vuln": 0.66, "infra": 0.75, "terrain": "Lower Gangetic Delta"},
    {"id": "WB-S24", "name": "South 24 Parganas (Sundarbans)", "state": "West Bengal", "is_ut": False, "lat": 22.1645, "lon": 88.5997, "pop": 8161000, "vuln": 0.92, "infra": 0.35, "terrain": "Mangrove Tidal Delta"},
    {"id": "WB-DAR", "name": "Darjeeling", "state": "West Bengal", "is_ut": False, "lat": 27.0410, "lon": 88.2663, "pop": 1846000, "vuln": 0.76, "infra": 0.52, "terrain": "Himalayan Ridge"},

    # 11. Uttar Pradesh (Northern Plains - Floods, Heat, Drought)
    {"id": "UP-LUK", "name": "Lucknow", "state": "Uttar Pradesh", "is_ut": False, "lat": 26.8467, "lon": 80.9462, "pop": 4589000, "vuln": 0.54, "infra": 0.72, "terrain": "Central Plains"},
    {"id": "UP-VAR", "name": "Varanasi", "state": "Uttar Pradesh", "is_ut": False, "lat": 25.3176, "lon": 82.9739, "pop": 3676000, "vuln": 0.65, "infra": 0.60, "terrain": "Ganga Flood Basin"},
    {"id": "UP-GOR", "name": "Gorakhpur", "state": "Uttar Pradesh", "is_ut": False, "lat": 26.7606, "lon": 83.3732, "pop": 4440000, "vuln": 0.81, "infra": 0.49, "terrain": "Tarai Floodplain"},
    {"id": "UP-BND", "name": "Banda (Bundelkhand)", "state": "Uttar Pradesh", "is_ut": False, "lat": 25.4740, "lon": 80.3340, "pop": 1799000, "vuln": 0.86, "infra": 0.40, "terrain": "Bundelkhand Drought Zone"},

    # 12. Madhya Pradesh (Central - Heatwaves & Drought)
    {"id": "MP-BHO", "name": "Bhopal", "state": "Madhya Pradesh", "is_ut": False, "lat": 23.2599, "lon": 77.4126, "pop": 2371000, "vuln": 0.52, "infra": 0.68, "terrain": "Central Highlands"},
    {"id": "MP-IND", "name": "Indore", "state": "Madhya Pradesh", "is_ut": False, "lat": 22.7196, "lon": 75.8577, "pop": 3276000, "vuln": 0.48, "infra": 0.74, "terrain": "Malwa Plateau"},
    {"id": "MP-GWA", "name": "Gwalior", "state": "Madhya Pradesh", "is_ut": False, "lat": 26.2183, "lon": 78.1828, "pop": 2032000, "vuln": 0.74, "infra": 0.55, "terrain": "Northern Heat Belt"},

    # 13. Karnataka (Southern - Drought & Coastal Rain)
    {"id": "KA-BLR", "name": "Bengaluru Urban", "state": "Karnataka", "is_ut": False, "lat": 12.9716, "lon": 77.5946, "pop": 9621000, "vuln": 0.42, "infra": 0.85, "terrain": "Plateau Metropolis"},
    {"id": "KA-MNG", "name": "Dakshina Kannada (Mangaluru)", "state": "Karnataka", "is_ut": False, "lat": 12.9141, "lon": 74.8560, "pop": 2089000, "vuln": 0.62, "infra": 0.70, "terrain": "Konkan Coastal"},
    {"id": "KA-KAL", "name": "Kalaburagi (Gulbarga)", "state": "Karnataka", "is_ut": False, "lat": 17.3297, "lon": 76.8343, "pop": 2566000, "vuln": 0.81, "infra": 0.46, "terrain": "Kalyana-Karnataka Drylands"},

    # 14. Telangana (Deccan - Severe Heat & Drought)
    {"id": "TG-HYD", "name": "Hyderabad", "state": "Telangana", "is_ut": False, "lat": 17.3850, "lon": 78.4867, "pop": 6993000, "vuln": 0.44, "infra": 0.82, "terrain": "Deccan Metropolis"},
    {"id": "TG-KHA", "name": "Khammam", "state": "Telangana", "is_ut": False, "lat": 17.2473, "lon": 80.1514, "pop": 1401000, "vuln": 0.76, "infra": 0.52, "terrain": "Godavari Basin"},
    {"id": "TG-RAM", "name": "Ramagundam (Peddapalli)", "state": "Telangana", "is_ut": False, "lat": 18.7610, "lon": 79.4750, "pop": 795000, "vuln": 0.80, "infra": 0.55, "terrain": "Coal-Belt Heat Pocket"},

    # 15. Punjab (North - Heatwave & Agricultural Stress)
    {"id": "PB-LDH", "name": "Ludhiana", "state": "Punjab", "is_ut": False, "lat": 30.9010, "lon": 75.8573, "pop": 3498000, "vuln": 0.46, "infra": 0.72, "terrain": "Indo-Gangetic Basin"},
    {"id": "PB-ASR", "name": "Amritsar", "state": "Punjab", "is_ut": False, "lat": 31.6340, "lon": 74.8723, "pop": 2490000, "vuln": 0.52, "infra": 0.68, "terrain": "Border Plains"},

    # 16. Haryana (North - Heat & Groundwater Deficit)
    {"id": "HR-GUR", "name": "Gurugram", "state": "Haryana", "is_ut": False, "lat": 28.4595, "lon": 77.0266, "pop": 1514000, "vuln": 0.42, "infra": 0.84, "terrain": "National Capital Region"},
    {"id": "HR-HIS", "name": "Hisar", "state": "Haryana", "is_ut": False, "lat": 29.1492, "lon": 75.7217, "pop": 1743000, "vuln": 0.75, "infra": 0.58, "terrain": "Semi-Arid Plains"},

    # 17. Uttarakhand (Himalayan - Cloudbursts, Flash Floods, Landslides)
    {"id": "UK-DEH", "name": "Dehradun", "state": "Uttarakhand", "is_ut": False, "lat": 30.3165, "lon": 78.0322, "pop": 1696000, "vuln": 0.60, "infra": 0.66, "terrain": "Doon Valley Foothills"},
    {"id": "UK-CHA", "name": "Chamoli", "state": "Uttarakhand", "is_ut": False, "lat": 30.4233, "lon": 79.3283, "pop": 391000, "vuln": 0.89, "infra": 0.38, "terrain": "Glacial High Himalayan"},
    {"id": "UK-UTT", "name": "Uttarkashi", "state": "Uttarakhand", "is_ut": False, "lat": 30.7268, "lon": 78.4354, "pop": 330000, "vuln": 0.87, "infra": 0.36, "terrain": "Upper Bhagirathi Gorge"},

    # 18. Himachal Pradesh (Himalayan - Heavy Rainfall & Landslides)
    {"id": "HP-SHI", "name": "Shimla", "state": "Himachal Pradesh", "is_ut": False, "lat": 31.1048, "lon": 77.1734, "pop": 814000, "vuln": 0.64, "infra": 0.62, "terrain": "Middle Himalayan Ridge"},
    {"id": "HP-KUL", "name": "Kullu", "state": "Himachal Pradesh", "is_ut": False, "lat": 31.9579, "lon": 77.1095, "pop": 437000, "vuln": 0.84, "infra": 0.44, "terrain": "Beas River Valley"},

    # 19. Jammu and Kashmir (Himalayan Valley & High Altitude)
    {"id": "JK-SRI", "name": "Srinagar", "state": "Jammu and Kashmir", "is_ut": True, "lat": 34.0837, "lon": 74.7973, "pop": 1236000, "vuln": 0.72, "infra": 0.58, "terrain": "Jhelum Valley Basin"},
    {"id": "JK-JAM", "name": "Jammu", "state": "Jammu and Kashmir", "is_ut": True, "lat": 32.7266, "lon": 74.8570, "pop": 1529000, "vuln": 0.58, "infra": 0.65, "terrain": "Shivalik Plains"},

    # 20. Ladakh (Trans-Himalayan Cold Desert & Glacial Lake Outburst)
    {"id": "LA-LEH", "name": "Leh", "state": "Ladakh", "is_ut": True, "lat": 34.1526, "lon": 77.5771, "pop": 133000, "vuln": 0.82, "infra": 0.40, "terrain": "Cold High Desert"},

    # 21. Delhi (National Capital - Heatwave & Yamuna Floods)
    {"id": "DL-NDL", "name": "New Delhi", "state": "Delhi", "is_ut": True, "lat": 28.6139, "lon": 77.2090, "pop": 16787000, "vuln": 0.48, "infra": 0.88, "terrain": "Yamuna Plain"},

    # 22. Chandigarh (Union Territory)
    {"id": "CH-CHD", "name": "Chandigarh", "state": "Chandigarh", "is_ut": True, "lat": 30.7333, "lon": 76.7794, "pop": 1055000, "vuln": 0.32, "infra": 0.90, "terrain": "Shivalik Plain"},

    # 23. Puducherry (Coastal UT - Cyclones)
    {"id": "PY-PUD", "name": "Puducherry", "state": "Puducherry", "is_ut": True, "lat": 11.9416, "lon": 79.8083, "pop": 950000, "vuln": 0.65, "infra": 0.70, "terrain": "Coromandel Coastal"},

    # 24. Andaman and Nicobar Islands (Island UT - Cyclones & Tsunami)
    {"id": "AN-POR", "name": "Port Blair", "state": "Andaman and Nicobar Islands", "is_ut": True, "lat": 11.6234, "lon": 92.7265, "pop": 380000, "vuln": 0.80, "infra": 0.50, "terrain": "Oceanic Archipelago"},

    # 25. Lakshadweep (Island UT - Coastal Surges)
    {"id": "LD-KAV", "name": "Kavaratti", "state": "Lakshadweep", "is_ut": True, "lat": 10.5667, "lon": 72.6417, "pop": 64000, "vuln": 0.85, "infra": 0.45, "terrain": "Coral Atoll"},

    # 26. Dadra & Nagar Haveli and Daman & Diu (Coastal UT)
    {"id": "DN-DAM", "name": "Daman", "state": "Dadra and Nagar Haveli and Daman and Diu", "is_ut": True, "lat": 20.3974, "lon": 72.8328, "pop": 585000, "vuln": 0.60, "infra": 0.68, "terrain": "Arabian Coast"},

    # 27. Goa (Western Coast - Monsoon Surges)
    {"id": "GA-PAN", "name": "Panaji (North Goa)", "state": "Goa", "is_ut": False, "lat": 15.4909, "lon": 73.8278, "pop": 818000, "vuln": 0.52, "infra": 0.74, "terrain": "Mandovi Estuary Coast"},

    # 28. Chhattisgarh (Central Tribal Forest - Heat & Flash Flood)
    {"id": "CG-RAI", "name": "Raipur", "state": "Chhattisgarh", "is_ut": False, "lat": 21.2514, "lon": 81.6296, "pop": 4063000, "vuln": 0.62, "infra": 0.62, "terrain": "Mahanadi Basin"},
    {"id": "CG-BAS", "name": "Bastar (Jagdalpur)", "state": "Chhattisgarh", "is_ut": False, "lat": 19.0740, "lon": 82.0298, "pop": 1413000, "vuln": 0.84, "infra": 0.38, "terrain": "Forested Plateau"},

    # 29. Jharkhand (Eastern Chota Nagpur - Heat, Drought, Mining Flash Floods)
    {"id": "JH-RAN", "name": "Ranchi", "state": "Jharkhand", "is_ut": False, "lat": 23.3441, "lon": 85.3096, "pop": 2914000, "vuln": 0.60, "infra": 0.64, "terrain": "Chota Nagpur Plateau"},
    {"id": "JH-PAL", "name": "Palamu (Daltonganj)", "state": "Jharkhand", "is_ut": False, "lat": 24.0396, "lon": 84.0722, "pop": 1939000, "vuln": 0.85, "infra": 0.40, "terrain": "North Koel Drought Basin"},

    # 30. Sikkim (Himalayan - Cloudbursts & GLOF)
    {"id": "SK-GAN", "name": "Gangtok", "state": "Sikkim", "is_ut": False, "lat": 27.3389, "lon": 88.6065, "pop": 610000, "vuln": 0.81, "infra": 0.55, "terrain": "High Eastern Himalayan"},

    # 31. Arunachal Pradesh (Northeastern Eastern Himalayas - Flash Floods & Landslides)
    {"id": "AR-ITA", "name": "Itanagar (Papum Pare)", "state": "Arunachal Pradesh", "is_ut": False, "lat": 27.0844, "lon": 93.6053, "pop": 176000, "vuln": 0.83, "infra": 0.46, "terrain": "Sub-Himalayan Mountain"},
    {"id": "AR-PAS", "name": "Pasighat (East Siang)", "state": "Arunachal Pradesh", "is_ut": False, "lat": 28.0667, "lon": 95.3333, "pop": 99000, "vuln": 0.88, "infra": 0.40, "terrain": "Siang River Valley"},

    # 32. Meghalaya (Northeastern - Extreme Rainfall & Flash Floods)
    {"id": "ML-SHI", "name": "Shillong (East Khasi Hills)", "state": "Meghalaya", "is_ut": False, "lat": 25.5788, "lon": 91.8933, "pop": 825000, "vuln": 0.72, "infra": 0.58, "terrain": "Shillong Plateau"},
    {"id": "ML-CHE", "name": "Cherrapunji (Sohra)", "state": "Meghalaya", "is_ut": False, "lat": 25.2700, "lon": 91.7300, "pop": 120000, "vuln": 0.84, "infra": 0.42, "terrain": "Southern Escarpment (Heavy Rain)"},

    # 33. Nagaland (Northeastern Hills - Landslides)
    {"id": "NL-KOH", "name": "Kohima", "state": "Nagaland", "is_ut": False, "lat": 25.6751, "lon": 94.1086, "pop": 267000, "vuln": 0.78, "infra": 0.48, "terrain": "Naga Hills Ridge"},

    # 34. Manipur (Northeastern Valley - Floods & Landslides)
    {"id": "MN-IMP", "name": "Imphal", "state": "Manipur", "is_ut": False, "lat": 24.8170, "lon": 93.9368, "pop": 839000, "vuln": 0.76, "infra": 0.50, "terrain": "Imphal Valley Lowland"},

    # 35. Mizoram (Northeastern Rugged Hills - Landslides & Flash Floods)
    {"id": "MZ-AIZ", "name": "Aizawl", "state": "Mizoram", "is_ut": False, "lat": 23.7271, "lon": 92.7176, "pop": 400000, "vuln": 0.77, "infra": 0.52, "terrain": "Lushai Hills Ridge"},

    # 36. Tripura (Northeastern Valley - Flash Floods)
    {"id": "TR-AGA", "name": "Agartala (West Tripura)", "state": "Tripura", "is_ut": False, "lat": 23.8315, "lon": 91.2868, "pop": 918000, "vuln": 0.74, "infra": 0.54, "terrain": "Howrah River Basin"},
]

RESOURCE_CATEGORIES = [
    {
        "type": "Water pumps",
        "unit": "units",
        "movement_cost_per_km": 15.0,
        "base_stock": (20, 120),
        "min_reserve_ratio": 0.25,
        "suitable_hazards": ["Floods", "Cyclones"]
    },
    {
        "type": "Rescue teams",
        "unit": "personnel_units",
        "movement_cost_per_km": 40.0,
        "base_stock": (5, 45),
        "min_reserve_ratio": 0.30,
        "suitable_hazards": ["Floods", "Cyclones"]
    },
    {
        "type": "Rescue boats",
        "unit": "units",
        "movement_cost_per_km": 35.0,
        "base_stock": (10, 60),
        "min_reserve_ratio": 0.20,
        "suitable_hazards": ["Floods", "Cyclones"]
    },
    {
        "type": "Relief supply kits",
        "unit": "kits",
        "movement_cost_per_km": 5.0,
        "base_stock": (500, 4000),
        "min_reserve_ratio": 0.20,
        "suitable_hazards": ["Floods", "Heatwaves", "Droughts", "Cyclones"]
    },
    {
        "type": "Water tankers",
        "unit": "trucks",
        "movement_cost_per_km": 25.0,
        "base_stock": (15, 90),
        "min_reserve_ratio": 0.25,
        "suitable_hazards": ["Heatwaves", "Droughts"]
    },
    {
        "type": "Emergency medical kits",
        "unit": "kits",
        "movement_cost_per_km": 8.0,
        "base_stock": (100, 800),
        "min_reserve_ratio": 0.25,
        "suitable_hazards": ["Floods", "Heatwaves", "Droughts", "Cyclones"]
    },
    {
        "type": "Temporary shelters",
        "unit": "tents",
        "movement_cost_per_km": 18.0,
        "base_stock": (50, 500),
        "min_reserve_ratio": 0.20,
        "suitable_hazards": ["Floods", "Cyclones"]
    },
    {
        "type": "Emergency funds",
        "unit": "lakhs_inr",
        "movement_cost_per_km": 1.0,
        "base_stock": (20, 200),
        "min_reserve_ratio": 0.35,
        "suitable_hazards": ["Floods", "Heatwaves", "Droughts", "Cyclones"]
    }
]

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth's radius in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

def get_hazard_climate_signature(region: Dict[str, Any], day_offset: int, rng: random.Random) -> Dict[str, float]:
    """Generates realistic synthetic climate observations based on Indian geographical zones."""
    terrain = region.get("terrain", "")
    state = region.get("state", "")
    
    # Base seasonal weather
    # Synthetic day_offset (simulating monsoon/extreme weather season)
    base_rainfall = 5.0
    base_temp = 32.0
    base_humidity = 65.0
    base_wind = 14.0

    # Regional climate profiles:
    # Northeast & Bengal (Flood prone)
    if state in ["Assam", "Bihar", "Meghalaya", "Arunachal Pradesh", "West Bengal", "Kerala", "Sikkim"]:
        base_rainfall = 85.0 + rng.uniform(-20, 70)
        base_temp = 28.0 + rng.uniform(-3, 4)
        base_humidity = 88.0 + rng.uniform(-5, 10)
        base_wind = 22.0 + rng.uniform(-6, 18)
    # Desert & Dry Central (Heatwave & Drought)
    elif state in ["Rajasthan", "Madhya Pradesh", "Telangana", "Punjab", "Haryana", "Delhi"]:
        base_rainfall = 1.0 + max(0.0, rng.uniform(-5, 6))
        base_temp = 42.0 + rng.uniform(-2, 7)
        base_humidity = 28.0 + rng.uniform(-8, 12)
        base_wind = 18.0 + rng.uniform(-4, 12)
    # Coastal (Cyclone & Wind)
    elif state in ["Odisha", "Andhra Pradesh", "Tamil Nadu", "Gujarat", "Andaman and Nicobar Islands"]:
        base_rainfall = 35.0 + rng.uniform(-10, 50)
        base_temp = 31.0 + rng.uniform(-2, 5)
        base_humidity = 82.0 + rng.uniform(-6, 12)
        base_wind = 38.0 + rng.uniform(-8, 35)
    # Himalayan (Rainfall & Landslides)
    elif state in ["Uttarakhand", "Himachal Pradesh", "Jammu and Kashmir", "Ladakh"]:
        base_rainfall = 45.0 + rng.uniform(-15, 45)
        base_temp = 18.0 + rng.uniform(-4, 6)
        base_humidity = 72.0 + rng.uniform(-10, 15)
        base_wind = 20.0 + rng.uniform(-5, 15)

    # Calculate normalized hazard indicators [0.0 - 1.0]
    flood_idx = min(1.0, max(0.0, (base_rainfall - 20) / 120.0))
    heat_idx = min(1.0, max(0.0, (base_temp - 35) / 13.0))
    drought_idx = min(1.0, max(0.0, (40 - base_rainfall) / 40.0 * (1.0 - base_humidity / 100.0) * (base_temp / 40.0)))
    cyclone_idx = min(1.0, max(0.0, (base_wind - 25) / 50.0 * (base_humidity / 100.0)))

    # Regional weight enforcement
    if "Flood" in terrain or state in ["Assam", "Bihar", "Meghalaya"]:
        flood_idx = min(1.0, flood_idx * 1.35)
    if state == "Rajasthan":
        heat_idx = min(1.0, heat_idx * 1.4)
        drought_idx = min(1.0, drought_idx * 1.3)
    if "Coast" in terrain or state in ["Odisha", "Gujarat", "Andhra Pradesh"]:
        cyclone_idx = min(1.0, cyclone_idx * 1.3)

    return {
        "rainfall_mm": round(max(0.0, base_rainfall), 1),
        "temperature_c": round(base_temp, 1),
        "humidity_pct": round(min(100.0, max(15.0, base_humidity)), 1),
        "wind_speed_kmh": round(max(2.0, base_wind), 1),
        "flood_indicator": round(flood_idx, 3),
        "heatwave_indicator": round(heat_idx, 3),
        "drought_indicator": round(drought_idx, 3),
        "cyclone_indicator": round(cyclone_idx, 3),
    }

def generate_historical_time_series(region: Dict[str, Any], days: int = 90, rng: Optional[random.Random] = None) -> List[Dict[str, Any]]:
    if rng is None:
        rng = random.Random(RANDOM_SEED + hash(region["id"]))
    
    records = []
    base_date = datetime.now() - timedelta(days=days)
    
    for d in range(days):
        current_date = (base_date + timedelta(days=d)).strftime("%Y-%m-%d")
        sig = get_hazard_climate_signature(region, d, rng)
        
        # Calculate daily risk score
        vuln = region["vuln"]
        hazard_max = max(sig["flood_indicator"], sig["heatwave_indicator"], sig["drought_indicator"], sig["cyclone_indicator"])
        calc_risk = round(min(100.0, (hazard_max * 0.45 + vuln * 0.35 + (1.0 - region["infra"]) * 0.20) * 100), 1)
        
        records.append({
            "region_id": region["id"],
            "date": current_date,
            "rainfall_mm": sig["rainfall_mm"],
            "temperature_c": sig["temperature_c"],
            "humidity_pct": sig["humidity_pct"],
            "wind_speed_kmh": sig["wind_speed_kmh"],
            "flood_indicator": sig["flood_indicator"],
            "heatwave_indicator": sig["heatwave_indicator"],
            "drought_indicator": sig["drought_indicator"],
            "cyclone_indicator": sig["cyclone_indicator"],
            "calculated_risk": calc_risk
        })
    return records
