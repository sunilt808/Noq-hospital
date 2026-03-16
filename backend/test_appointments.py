from database import db

# Get a patient
patients = list(db.collection("users").where("role", "==", "patient").limit(1).stream())
if patients:
    p_id = patients[0].id
    print(f"Patient ID: {p_id}")
    
    # Check appointments
    appts = list(db.collection("appointments").where("patientId", "==", p_id).stream())
    print(f"Appointments found: {len(appts)}")
    
    # Check raw appointments
    all_appts = list(db.collection("appointments").limit(3).stream())
    print(f"Total appointments: {len(all_appts)}")
    if all_appts:
        for appt in all_appts[:1]:
            print(f"  Sample - patientId: {appt.to_dict().get('patientId')}")
