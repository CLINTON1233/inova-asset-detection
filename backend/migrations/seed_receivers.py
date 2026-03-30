import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from config import DB_CONFIG

def get_connection():
    try:
        conn = psycopg2.connect(
            host=DB_CONFIG['host'],
            database=DB_CONFIG['database'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port']
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def get_department_id(conn, department_name):
    """Mendapatkan department_id berdasarkan nama department"""
    try:
        cur = conn.cursor()
        cur.execute("SELECT id_department FROM departments WHERE department_name = %s", (department_name,))
        result = cur.fetchone()
        if result:
            return result[0]
        return None
    except Exception as e:
        return None

def seed_receivers():
    """Mengisi tabel master_receivers dengan data dari Excel"""
    conn = None
    try:
        conn = get_connection()
        if not conn:
            print("Failed to connect to database")
            return False
        
        cur = conn.cursor()
        
        # Truncate table master_receivers
        cur.execute("TRUNCATE TABLE master_receivers RESTART IDENTITY CASCADE")
        
        # Data receiver dari Excel (name, department_name, title)
        receivers_data = [
            ("RAJAGUBAL S/O RAMAN", "Secondee", "MANAGER"),
            ("SREEKUMAR DAMODARAN PILLAI", "Secondee", "Construction Manager"),
            ("BEEBU KOLLAM PARAMPIL PONNAPPAN", "Secondee", "SECTION MANAGER STRUCTURE & ARCHITECTURE"),
            ("SAKTHIVEL MURUGAN", "Secondee", "Project Engineer"),
            ("SHAJI SATHRUKNAN", "Secondee", "Structural Engineer"),
            ("MD HABIBUR RAHMAN", "Secondee", "Structural Engineer"),
            ("ABDUL RASHEED MOHAMED NIZAR", "Secondee", "OPERATION MANAGER"),
            ("WIN MYINT SOE", "Secondee", "QC DEPUTY MANAGER"),
            ("LEOW BOON LEONG ANTHONY", "Secondee", "QA QC YARD MANAGER"),
            ("GHOSH SUKANTA", "Secondee", "CONSTRUCTION PROJECT MANAGER"),
            ("VELLIAN SELVARAJ", "Secondee", "CONSTRUCTION MANAGER"),
            ("LAKSHMANAN BABU", "Secondee", "Piping Engineer"),
            ("BHANDARI VIKAS KAMAL", "Secondee", "MECHANICAL MANAGER"),
            ("CAI YIXIANG", "Secondee", "President Director"),
            ("GOVINDARAJAN PRABAKAR", "Secondee", "QAQC ENGINEER"),
            ("AKULA RAVI TEJA", "Secondee", "SECTION MANAGER"),
            ("PEETHAMBARAN THAIKKOOTTATHIL", "Secondee", "QC DEPUTY MANAGER"),
            ("RAJENDRAN SATHISKUMAR", "Secondee", "Mechanical Engineer"),
            ("LIM CHIAT LING", "Secondee", "FINANCE MANAGER"),
            ("MARIMUTHU KATHIRAVAN", "Secondee", "QAQC ENGINEER"),
            ("THIRUNAVUKKARASU HEMACHANDARAN", "Secondee", "QAQC ENGINEER"),
            ("KO REH", "Secondee", "FIELD STEEL STRUCTURE ENGINEER"),
            ("KANDASAMY MOHANASUNDARAM", "Secondee", "QA/QC"),
            ("KUPPUSAMY BACKIARAJ", "Secondee", "Electrical Engineer"),
            ("RAMINENI SRIDHAR", "Secondee", "Electrical Engineer"),
            ("ERIC CHUA LE QIANG", "Secondee", "STEEL STRUCTURED LEAD ENGINEER"),
            ("SHAJAHAN RISWAN", "Secondee", "MECHANICAL ENGINEER"),
            ("PATEL PARESHKUMAR", "Secondee", "OPERATION MANAGER"),
            ("Muhammad Syarifudien", "QA & QC", "Coating Specialist"),
            ("Edang Gunawan", "IYM", "Operations Officer"),
            ("Yaufi", "IYM", "Operations Officer"),
            ("Partoyo", "Operation & Maintenance", "Excavator"),
            ("Roniman", "Operation & Maintenance", "Loader Operator"),
            ("Rudi Santoso", "Works", "Carpenter"),
            ("Mirna", "Operation & Maintenance", "Senior Document Control"),
            ("Supriadi", "Works", "Forklift Operator"),
            ("Iswandi", "Operation & Maintenance", "Senior Store Keeper"),
            ("SIDO MULYONO", "IYM", "Asst Operation Officer"),
            ("Muhammad Sadli", "Operation & Maintenance", "Operation&Maintenance Manager"),
            ("Saiful Anwar", "Operation & Maintenance", "Helper"),
            ("Sariyono", "Structure", "Senior Structural Supervisor"),
            ("Suwandri", "QA & QC", "Lead Dimensional Controller"),
            ("Purwandi", "Operation & Maintenance", "Scaffolder Assistant Foreman"),
            ("Tofik Sungkowo", "Structure", "Fitter I"),
            ("Hapis Rivai", "Operation & Maintenance", "Excavator"),
            ("Hasmaryadi", "Works", "Crane Operator"),
            ("Yudiantonius Purba", "HR & Admin", "Paramedic"),
            ("AHMAD DARMADI", "Structure", "Fitter II"),
            ("Budi Santoso", "Structure", "Production Engineer"),
            ("Hendi", "Operation & Maintenance", "Senior Foreman"),
            ("Hasanuddin", "Works", "Helper"),
            ("Hermanto Sijabat", "Works", "Senior Rigger Supervisor"),
            ("Listiyono", "Security", "Assistant Security Coordinator"),
            ("Sujiko Santoso", "Procurement", "Warehouse Supervisor"),
            ("Syamsul Akhiyar", "Operation & Maintenance", "Senior Civil Engineer"),
            ("Salim", "Operation & Maintenance", "Foreman"),
            ("Faisal Budiman ST", "Operation & Maintenance", "Senior Electrical Supervisor"),
            ("Deddie Saputra", "PMT Gamma", "Acting Head PMO"),
            ("Aan wahyudi", "HR & Admin", "Senior HR Officer"),
            ("Gian Sunarto", "IT", "IT Officer"),
            ("Didi Haryanto", "Structure", "Section Manager"),
            ("BASUKI RACHMAT", "IYM", "Senior Supervisor"),
            ("Suryani", "Contract", "Contract Manager"),
            ("Adinaroma Sinaga", "HR & Admin", "Doctor"),
            ("Wirna", "HR & Admin", "HR Executive"),
            ("Haradongan Pasaribu", "E&I and Automation", "EIT Engineer"),
            ("Aryanti", "HSE", "Senior Environmental Engineer"),
            ("Musidik", "Operation & Maintenance", "Senior Supervisor"),
            ("Risviyandi Purnawarman", "E&I and Automation", "EIT Engineer"),
            ("Ida", "Marketing", "Compliance / Risk Manager"),
            ("Yuli Arifin", "Procurement", "Logistic/Shipping Manager"),
            ("Pembalasen Tarigan", "HSE", "Yard HSSE Manager"),
            ("Pristiwanto Nugroho", "HR & Admin", "Senior HR/GA Supervisor"),
            ("Tommy Chandra", "Procurement", "Procurement Assistant Manager"),
            ("Erwan Firmansyah", "Finance", "Payroll Executive"),
            ("Dian Budiany", "Contract", "Contract Assistant Manager"),
            ("Badrul Munir", "Structure", "Senior Welder Supervisor"),
            ("Sumantri", "Contract", "Senior Cost Controller"),
            ("Eldiansyah", "HR & Admin", "HR & Admin Manager"),
            ("Adik Ipan", "Operation & Maintenance", "Lifting&Rigging Superintendent"),
            ("Shearly Yunita Loebis", "Finance", "Lead Account Payable"),
            ("Zulfefi Hendra Putra", "PMT Petrobas", "Warehouse Superintendent"),
            ("Wawan Susilo", "Works", "Rigger"),
            ("Wahyu Hidayat", "IT", "IT Manager"),
            ("Afifuddin Sulaiman", "Works", "Mechanic"),
            ("Sugiyarto", "Operation & Maintenance", "Plumber Foreman"),
            ("Suyino", "PMT Gamma", "Forklift Operator"),
            ("Riki Pratama", "Works", "Helper"),
            ("Catur Margi Utomo", "Structure", "Welder 6GR SMAW FCAW GS+Goug"),
            ("Yosafat Kristianto L Bancin", "Operation & Maintenance", "Civil Engineer"),
            ("Indra Gunawan, ST", "Operation & Maintenance", "Civil Engineer"),
            ("Juari Wibowo", "QA & QC", "Welding Trainer & Instructor"),
            ("Fatahillah Azukma", "Machinery", "Senior CNC Foreman"),
            ("Salwarman", "QA & QC", "QA QC Construction Manager"),
            ("Thamrin", "Works", "Electrical Foreman"),
            ("Syamsurizal", "Operation & Maintenance", "Senior Mechanical Foreman"),
            ("Jefri", "Blasting & Painting", "Senior Foreman"),
            ("Martha Novidian Arif", "Operation & Maintenance", "Mechanic Foreman"),
            ("Ikhsan Kurniawan", "IT", "IT Assistant Manager (Infrastructure)"),
            ("Abdul Syahbro", "QA & QC", "Senior QA Engineer"),
            ("Nurdi", "Works", "Rigger"),
            ("Nofriadi", "Structure", "Fitter I"),
            ("ANRIAWAN", "PMT Petrobas", "Fitter I"),
            ("Ahmad Morwasi", "Structure", "Welder Foreman"),
            ("Agung Saputra", "Structure", "Welder 3G / 4G FCAW GS"),
            ("Dondy Panjaitan", "Structure", "Fitter I"),
            ("Susanto", "PMT Petrobas", "Storeman"),
            ("SUKIRNO", "Operation & Maintenance", "Painter"),
            ("Heri Setyo Wibowo", "PMT Petrobas", "Lifting Supervisor"),
            ("Muhammad Daud", "Works", "Crane Operator"),
            ("Berlintua Hutagalung", "Works", "Forklift Operator"),
            ("WARIANTO", "Works", "Rigger Foreman"),
            ("Nanda Yulistyono", "Procurement", "Warehouse Supervisor"),
            ("BUSTARI", "PMT Petrobas", "Welder 6G GTAW/SMAW CS"),
            ("Nikson Silalahi", "QA & QC", "QC Inspector"),
            ("Rofi Kosmera", "Structure", "Fitter I"),
            ("Benny Kusuma", "QA & QC", "Lead Material Inspector"),
            ("Wira Toha Pratama", "Operation & Maintenance", "Carpenter"),
            ("Wulandari", "HSE", "HSE Supervisor"),
            ("Tori", "Piping & Outfitting", "Fitter I"),
            ("Helman Basyari", "Structure", "Welder 6G SMAW"),
            ("Marzuki", "Structure", "Fitter I"),
            ("Kusdarmaji", "Works", "Rigger"),
            ("Eliskal Effendi", "Shipwright", "Scaffolder Superintendent"),
            ("Muhammad Taufik", "PMT Petrobas", "OHC Operator"),
            ("Achmad Joesoep", "Works", "Rigger"),
            ("Henderi", "Works", "Rigger Foreman"),
            ("Lena Marlena", "Works", "Helper"),
            ("Muhammad Misro", "Works", "Helper"),
            ("Muhammad Nur", "Works", "Helper"),
            ("Imam Safi'i", "Works", "Helper"),
            ("Shobirin", "Works", "Helper"),
            ("Nurhadiyanto", "Works", "Mechanic"),
            ("Nasri", "Structure", "Construction Superintendent"),
            ("Riono", "Procurement", "Warehouse Supervisor"),
            ("Irvan", "Works", "Mechanic"),
            ("HASAN RIVAI", "Structure", "Fitter II"),
            ("Martin Prayoga", "Structure", "Fitter I"),
            ("PURWINTO", "PMT Petrobas", "Blaster"),
            ("Ade Putra Harifin", "Operation & Maintenance", "Painter"),
            ("Eko Arisandi", "Warehouse", "Warehouse Foreman"),
            ("Imran Simbolon", "PMT Petrobas", "Electrician"),
            ("Erwin Effendi Siagian", "Structure", "Welder 3G / 4G FCAW GS"),
            ("Supiandra", "PMT Petrobas", "Grinder"),
            ("Saeful Abidin", "Works", "Helper"),
            ("Mustakin", "Structure", "Welder 3G / 4G FCAW GS"),
            ("Marthin Silaen", "Works", "Senior Electrician"),
            ("Jonsorio", "Works", "Electrician"),
            ("Firda Adi Rianto", "Structure", "Project Engineer"),
            ("Ernawan", "Works", "Operator Trailer"),
            ("Sahruddin", "Works", "Rigger Supervisor"),
            ("Rahmat", "Works", "SPMT Operator"),
            ("Yudhi Irhandi Dayaputra", "Works", "OHC Operator"),
            ("Densi Boja", "Operation & Maintenance", "Foreman"),
            ("Jian", "Works", "Helper"),
            ("Imam Syafii", "HR & Admin", "Admin Assistant"),
            ("YUSRI", "PMT Petrobas", "Junior Quantity Surveyor"),
            ("I Made Dwi Septianto", "Security", "Admin Clerk"),
            ("David Bowi", "Works", "Senior Electrician"),
            ("M Dedi Riyanto", "IYM", "Asst Operation Officer"),
            ("Ganang Pambudi S.Kom", "Engineering", "Piping Engineer"),
            ("Lioandeska", "PMT Petrobas", "Materialman"),
            ("Farid Arofi", "Engineering", "Drafter Procedure"),
            ("KAMILAH BINTI MOHAMMED HASHIM", "Secondee", "Piping Engineer"),
            ("Deddy Hadiyanto", "Engineering", "Senior Drafter"),
            ("Sanwi", "Structure", "Welder 3G / 4G FCAW GS"),
            ("NUR SAIDDUDIN", "IYM", "Asst Operation Officer"),
            ("Egenius Gaudentius", "Shipwright", "Scaffolder Foreman"),
            ("Ahmad Febrihantaka Yoga Perdana", "Shipwright", "Senior Document Control"),
            ("Dedi Arsandi", "Piping & Outfitting", "Quality Quantity Control"),
            ("ADI SUSILO", "Works", "Fitter II"),
            ("Leni Mardalena", "Finance", "Finance Asst. Officer"),
            ("Sunu Jatmiko ST", "Planning", "Junior Planner"),
            ("Fitri Ani", "Blasting & Painting", "Document Control"),
            ("Anthoni Rizkan H", "Engineering", "Drafter"),
            ("Syafaruddin", "Piping & Outfitting", "Pipe Fitter I"),
            ("Sukamto", "Structure", "Fitter I"),
            ("Ardiansyah", "Structure", "Welder Foreman"),
            ("Agus Mulyadi", "Piping & Outfitting", "Fitter I"),
            ("M Yatim", "Warehouse", "Fitter I"),
            ("Ahmad Mursal", "Piping & Outfitting", "Pipe Fitter I"),
            ("Berno Simanjuntak", "Structure", "Fitter I"),
            ("Dedi Rahayu", "Piping & Outfitting", "Pipe Fitter Foreman"),
            ("Heri Gunawan", "QA & QC", "Dimensional Controller"),
            ("Umi Chasanah", "PMT Gamma", "Document Control"),
            ("Hendri Saputra", "Piping & Outfitting", "Production Engineer"),
            ("Aang Prasetyo", "Structure", "Production Engineer"),
            ("Budiono", "Structure", "Fitter I"),
            ("Roslan", "PMT Petrobas", "Fitter I"),
            ("Alextiyus Sahrialafani", "Works", "Fitter II"),
            ("Yuik Setiawan", "Structure", "Welder Foreman"),
            ("Samuel Sahat Alfin Silaen", "HSE", "HSE Lead"),
            ("Safardiman", "Works", "Crane Operator"),
            ("Bakhtiar", "Machinery", "CNC Foreman"),
            ("Hadi Suwandi", "Works", "Forklift Operator"),
            ("Nur Khumalasari", "HR & Admin", "Senior HR Officer"),
            ("Doan Kurniawan", "Structure", "Production Engineer"),
            ("Marmin", "PMT Petrobas", "Fitter I"),
            ("Warsito", "PMT Petrobas", "Crane Operator Foreman"),
            ("Aldi", "Works", "Rigger"),
            ("Manogari Situmorang", "Engineering", "Senior Drafter"),
            ("Richo Paleja Putra", "PMT Petrobas", "Welder 6G GTAW/SMAW CS"),
            ("Yeni Elfita", "HSE", "HSE Officer"),
            ("Nasri", "Works", "Rigger"),
            ("Ambok Ilang", "Works", "Crane Operator"),
            ("Dian Iskandar", "Structure", "Fitter I"),
            ("Adi Purnomo", "Structure", "Welder Supervisor"),
            ("Muizzuddin", "Piping & Outfitting", "Pipe Fitter Foreman"),
            ("M.Syafei", "Works", "Rigger"),
            ("Dian Arfany", "PMT Petrobas", "Pipe Fitter I"),
            ("Hendra Adi Syahputra", "PMT Petrobas", "Pipe Fitter I"),
            ("Suharman", "Works", "Rigger"),
            ("Sofyan", "Works", "Fitter I"),
            ("Jimin Ahdi Sunarko", "Works", "Crane Operator"),
            ("Muchammad Elmizan", "PMT Petrobas", "Welder 6G SMAW"),
            ("Saut Roberto Sibarani", "Piping & Outfitting", "Pipe Fitter I"),
            ("Junifer Siahaan", "Piping & Outfitting", "Pipe Fitter I"),
            ("Yoserizal", "PMT Petrobas", "Rigger"),
            ("Wandy", "PMT Petrobas", "Grinder Foreman"),
            ("Eko Wahyudi", "QA & QC", "QC Inspector"),
            ("TAN JIA EN", "Secondee", "YARD MANAGER (OPERATION)"),
            ("Heriyanto", "PMT Petrobas", "Welder Foreman"),
            ("Partaonan Nasution", "PMT Petrobas", "Welder 6G GTAW/SMAW SS"),
        ]
        
        inserted_count = 0
        for receiver_name, department_name, title in receivers_data:
            try:
                # Get department_id berdasarkan nama department
                department_id = get_department_id(conn, department_name)
                
                # Insert ke master_receivers dengan department_id
                cur.execute("""
                    INSERT INTO master_receivers (receiver_name, department_id, receiver_title)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (receiver_name) DO UPDATE SET 
                        department_id = EXCLUDED.department_id,
                        receiver_title = EXCLUDED.receiver_title,
                        updated_at = CURRENT_TIMESTAMP
                """, (receiver_name, department_id, title))
                inserted_count += 1
            except Exception as e:
                print(f"  Warning: Could not insert {receiver_name}: {e}")
        
        conn.commit()
        print(f"✅ Berhasil memasukkan {inserted_count} data receiver!")
        
        return True
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("="*50)
    print("SEED RECEIVERS")
    print("="*50)
    
    # Seed receivers
    seed_receivers()
    
    print("\n✅ All done!")