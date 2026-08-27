export type Person = {
  "Title Code": string;
  "Full Name": string;
  Phone?: string;
  Email?: string;
  "Reports To"?: string;
  Department?: string;
  Region?: string;
  Level?: string;
};

export type ActivityRow = {
  id: string;
  Status?: string;
  Title?: string;
  RetailerId?: string;
  "Application Date"?: string;
  "Scheduled Date"?: string;
  Address?: string;
  Route?: string;
  Task?: string;
  Model?: string;
  Brand?: string;
  Area?: string;
  Phone?: string;
  Notes?: string;
  "More Notes"?: string;
};

export type NewActivityRow = Omit<ActivityRow, "id">;
