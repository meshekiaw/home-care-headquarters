// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Assessment618Form from "./Assessment618Form";
import { ClientSigningMode } from "@/components/assessments/ClientSigningMode";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), signatures: [] as Record<string, unknown>[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useAgencyFormDefaults", () => ({ useAgencyFormDefaults: () => ({ defaults: {} }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: () => {} }) }));
vi.mock("@/components/assessments/Form618Sections", () => ({ Form618Sections: () => null }));
vi.mock("@/utils/form618Pdf", () => ({ downloadForm618Pdf: vi.fn(), printForm618Pdf: vi.fn() }));
vi.mock("@/components/forms/SignaturePad", () => ({ SignaturePad: ({ onSignature }: { onSignature: (s: string) => void }) => (
  <button onClick={() => onSignature("data:image/png;base64,dGVzdA==")}>Draw test signature</button>
) }));

const form = {
  id: "test-form", nurse_assessment_id: "test-assessment", status: "draft", version: 1,
  client_signs_by_mark: true, client_signature_status: "pending", form_data: { details: {
    medicaidId: "TEST", dateOfBirth: "01/01/2000", planStatus: "Initial", currentAssessmentDate: "11/02/2026",
    startOfCareOriginal: "11/01/2026", assessingRn: "Test Nurse",
  } },
};
function signature(slot: string, name: string, type = "witness") {
  return { id: slot, signature_slot: slot, signer_name: name, signer_type: type, signature_data: "", signed_at: "2026-11-02T14:00:00Z" };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.signatures = [signature("sec11_nurse", "Test Nurse", "nurse"), signature("sec4_client", "Test Client", "client"), signature("sec13_client", "Test Client", "client")];
  mocks.rpc.mockImplementation(async (name, args) => {
    if (name === "nurse_assessment_detail") return { data: [{ client_name: "Test Client" }], error: null };
    if (name === "add_618_signature") {
      mocks.signatures.push(signature(args.p_signature_slot, args.p_signer_name, args.p_signer_type));
      return { data: "test-signature", error: null };
    }
    return { data: { success: true }, error: null };
  });
  mocks.from.mockImplementation((table) => {
    const result = { data: table === "assessment_618_forms" ? [form] : table === "assessment_618_signatures" ? [...mocks.signatures] : null, error: null };
    const query = { select: () => query, eq: () => query, order: () => Promise.resolve(result), update: () => query,
      then: (resolve: (r: typeof result) => void) => Promise.resolve(result).then(resolve) };
    return query;
  });
});
afterEach(cleanup);
async function open() {
  render(<MemoryRouter initialEntries={["/assessments/test-assessment/618"]}><Routes><Route path="/assessments/:id/618" element={<Assessment618Form />} /></Routes></MemoryRouter>);
  await screen.findByRole("heading", { name: "618 Assessment" });
}
async function submitWitness(name: string, buttonName: string) {
  fireEvent.change(screen.getByLabelText("Full legal name *"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Relationship to the client *"), { target: { value: "Test witness" } });
  fireEvent.click(screen.getByLabelText("I have read the statement above and I agree to it."));
  fireEvent.click(screen.getByRole("button", { name: "Draw test signature" }));
  fireEvent.click(screen.getByRole("button", { name: buttonName }));
}
describe("618 witness handoff without an account or live data", () => {
  it("opens Witness 2 with an empty name and stores distinct signer names independently", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Hand device to both witnesses" }));
    await submitWitness("Test Witness One", "Submit and go to the next statement");
    await screen.findByRole("heading", { name: "Witness 2: please sign" });
    expect((screen.getByLabelText("Full legal name *") as HTMLInputElement).value).toBe("");
    await submitWitness("Test Witness Two", "Submit my signature");
    await screen.findByRole("heading", { name: "Thank you — your signatures were saved" });
    expect(mocks.signatures.filter(s => String(s.signature_slot).startsWith("sec4_witness")).map(s => s.signer_name)).toEqual(["Test Witness One", "Test Witness Two"]);
  });
  it("disables completion for the same witnesses regardless of case or extra spaces", async () => {
    mocks.signatures.push(signature("sec4_witness_1", "Test  Witness"), signature("sec4_witness_2", " test witness "));
    await open();
    const complete = screen.getByRole("button", { name: "Complete and lock this assessment" });
    expect((complete as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(complete);
    expect(mocks.rpc.mock.calls.some(([name]) => name === "complete_618_form")).toBe(false);
  });
  it("completes an otherwise-ready form with different witnesses", async () => {
    mocks.signatures.push(signature("sec4_witness_1", "Test Witness One"), signature("sec4_witness_2", "Test Witness Two"));
    await open();
    const complete = screen.getByRole("button", { name: "Complete and lock this assessment" });
    expect((complete as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(complete);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("complete_618_form", { p_form_id: "test-form" }));
  });
  it("preserves same-person name carry-forward for client signatures", async () => {
    render(<ClientSigningMode clientName="Test Client" nurseEmail="" instructions="" onExit={() => {}} onSubmit={async () => true}
      steps={[
        { key: "sec4_client", heading: "Client first statement", attestation: "Test statement", outstandingLabel: "First", askRelationship: true },
        { key: "sec13_client", heading: "Client second statement", attestation: "Test statement", outstandingLabel: "Second", askRelationship: true },
      ]} />);
    await submitWitness("Test Client", "Submit and go to the next statement");
    await screen.findByRole("heading", { name: "Client second statement" });
    expect((screen.getByLabelText("Full legal name *") as HTMLInputElement).value).toBe("Test Client");
  });
});