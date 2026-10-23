import { describe, it, expect } from "vitest";
import { VISIBLE_ONBOARDING_STEPS, onboardingProgress, documentValidation, MAX_DOCUMENT_BYTES, contactSchema } from "./caregiverOnboarding";
import { validateUpload, hasValidFileHeader } from "../../supabase/functions/caregiver-documents/upload-rules";
import { canUpload, canRead } from "../../supabase/functions/caregiver-documents/access";

describe("caregiver onboarding rules", () => {
  it("shows only caregiver steps 1–6 and orientation 12", () => {
    expect([...VISIBLE_ONBOARDING_STEPS]).toEqual([1,2,3,4,5,6,12]);
  });
  it("counts approved/not-applicable only, excluding office steps", () => {
    expect(onboardingProgress([{ step_number:1,status:"approved" },{ step_number:6,status:"not_applicable" },{ step_number:7,status:"approved" },{ step_number:12,status:"submitted" }])).toBe(2);
  });
  it("accepts PDF JPG PNG HEIC on both client and server", () => {
    for (const [name,type] of [["id.pdf","application/pdf"],["id.jpg","image/jpeg"],["id.png","image/png"],["id.heic","image/heic"]]) {
      expect(documentValidation({name,type,size:10},0)).toBeNull();
      expect(validateUpload({name,type,size:10})).toBeNull();
    }
    expect(validateUpload({name:"id.svg",type:"image/svg+xml",size:10})).not.toBeNull();
  });
  it("caps each file at 10 MB on client and server", () => {
    expect(MAX_DOCUMENT_BYTES).toBe(10485760);
    expect(validateUpload({name:"id.pdf",type:"application/pdf",size:10485760})).toBeNull();
    expect(validateUpload({name:"id.pdf",type:"application/pdf",size:10485761})).not.toBeNull();
    expect(documentValidation({name:"id.pdf",type:"application/pdf",size:10485761},0)).not.toBeNull();
  });
  it("allows two files, not three", () => {
    expect(documentValidation({name:"back.jpg",type:"image/jpeg",size:10},1)).toBeNull();
    expect(documentValidation({name:"third.jpg",type:"image/jpeg",size:10},2)).not.toBeNull();
  });
  it("locks approved steps but permits sent-back reuploads", () => {
    expect(canUpload(["caregiver"],true,"photo_id",true)).toBe(false);
    expect(canUpload(["caregiver"],true,"photo_id",false)).toBe(true);
  });
  it("cannot read office-uploaded files or upload office steps", () => {
    expect(canRead(["caregiver"],true,false)).toBe(false);
    expect(canUpload(["caregiver"],true,"background_check",false)).toBe(false);
    expect(canUpload(["caregiver"],false,"photo_id",false)).toBe(false);
  });
  it("rejects SSN and DOB on the personal form", () => {
    const contact={address:"1 Test Street",city:"Test City",state:"AR",zip_code:"72201",phone:"202-555-0100",emergency_contact_name:"Test Contact",emergency_contact_relationship:"Friend",emergency_contact_phone:"202-555-0101"};
    expect(contactSchema.safeParse(contact).success).toBe(true);
    expect(contactSchema.safeParse({...contact,ssn:"123",date_of_birth:"2000-01-01"}).success).toBe(false);
    expect(contactSchema.safeParse({...contact,zip_code:"bad"}).success).toBe(false);
  });
  it("checks actual file headers, not just extensions", async () => {
    expect(await hasValidFileHeader(new Blob(["not a PDF"]),"id.pdf")).toBe(false);
    expect(await hasValidFileHeader(new Blob(["%PDF-1.7\n"]),"id.pdf")).toBe(true);
    expect(await hasValidFileHeader(new Blob([new Uint8Array([137,80,78,71,13,10,26,10])]),"id.png")).toBe(true);
    expect(await hasValidFileHeader(new Blob([new Uint8Array([255,216,255])]),"id.jpg")).toBe(true);
    expect(await hasValidFileHeader(new Blob([new Uint8Array([0,0,0,24]),"ftypheic"]),"id.heic")).toBe(true);
  });
});