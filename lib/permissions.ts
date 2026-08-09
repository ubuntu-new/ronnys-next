/** უფლებების სია — ცალკე ფაილში, რადგან "use server" მოდული
 *  მხოლოდ async ფუნქციებს ექსპორტავს. */
export const PERMISSIONS = [
  { id: "can_edit_menu", label: "მენიუს რედაქტირება" },
  { id: "can_discount", label: "ფასდაკლებები და ლოიალობა" },
  { id: "can_refund", label: "თანხის დაბრუნება" },
  { id: "can_void", label: "შეკვეთის გაუქმება" },
  { id: "can_manage_staff", label: "თანამშრომლების მართვა" },
  { id: "can_view_reports", label: "რეპორტების ნახვა" },
  { id: "can_transfer_branch", label: "ფილიალებს შორის გადატანა" },
];
