import { Input } from "@/components/ui/input";
import { DateMaskInput } from "@/components/forms/DateMaskInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADL_COLUMNS,
  ADL_LEVELS,
  BATHING_TYPE_OPTIONS,
  DAY_LABELS,
  EATING_OPTIONS,
  EATING_PARENT,
  EATING_SUB_OPTIONS,
  GROOMING_ROWS,
  HELP_LEVELS,
  MEALS_OPTIONS,
  MENTAL_STATUS_OPTIONS,
  PHYSICAL_GROUPS,
  PLAN_STATUS_OPTIONS,
  RESIDES_OPTIONS,
  SERVICE_LOCATION_OPTIONS,
  type Form618Details,
} from "@/utils/form618Details";

interface Props {
  details: Form618Details;
  disabled?: boolean;
  onChange: (updater: (prev: Form618Details) => Form618Details) => void;
  /** Section IX — Assessment Narrative, rendered between Sections VIII and X. */
  sectionIX?: React.ReactNode;
  /** Section XII — Personal Care Service Plan, rendered between Sections XI and XIII. */
  sectionXII?: React.ReactNode;
}

const NONE = "__none__";

export function Form618Sections({ details, disabled, onChange, sectionIX, sectionXII }: Props) {
  const set = <K extends keyof Form618Details>(key: K, value: Form618Details[K]) =>
    onChange((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: "mentalStatus" | "physical" | "bathingTypes" | "eating" | "meals", option: string) =>
    onChange((prev) => {
      const has = prev[key].includes(option);
      let next = has ? prev[key].filter((o) => o !== option) : [...prev[key], option];
      // The eating sub-options only apply under "Needs help with eating:".
      if (key === "eating" && option === EATING_PARENT && has) {
        next = next.filter((o) => !EATING_SUB_OPTIONS.includes(o as any));
      }
      return { ...prev, [key]: next };
    });

  const text = (
    id: string,
    label: string,
    key: keyof Form618Details,
    opts: { required?: boolean; placeholder?: string; off?: boolean; hint?: string } = {},
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id} className={opts.off ? "text-muted-foreground" : undefined}>
        {label}
        {opts.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={id}
        value={String(details[key] ?? "")}
        placeholder={opts.off ? opts.hint : opts.placeholder}
        disabled={disabled || opts.off}
        onChange={(e) => set(key, e.target.value as any)}
      />
    </div>
  );

  const dateField = (
    id: string,
    label: string,
    key: keyof Form618Details,
    opts: { required?: boolean } = {},
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {opts.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <DateMaskInput
        id={id}
        value={String(details[key] ?? "")}
        disabled={disabled}
        onChange={(v) => set(key, v as any)}
      />
    </div>
  );

  /** Selecting anything other than "Other" clears the matching describe lines. */
  const pickChoice = (key: "planStatus" | "residesType" | "serviceLocationType", value: string) =>
    onChange((prev) => {
      const next = { ...prev, [key]: value } as Form618Details;
      if (key === "residesType" && value !== "Other") {
        next.residesOther1 = "";
        next.residesOther2 = "";
      }
      if (key === "serviceLocationType" && value !== "Other") {
        next.serviceLocationOther = "";
      }
      return next;
    });

  const choice = (
    label: string,
    key: "planStatus" | "residesType" | "serviceLocationType",
    options: readonly string[],
    required?: boolean,
  ) => (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select
        value={details[key] || NONE}
        disabled={disabled}
        onValueChange={(v) => pickChoice(key, v === NONE ? "" : v)}
      >
        <SelectTrigger className="min-h-[44px]">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Not selected</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const box = (option: string, key: Parameters<typeof toggle>[0], sub = false, off = false) => (
    <div key={option} className={`flex items-start gap-2 ${sub ? "ml-6" : ""}`}>
      <Checkbox
        id={`${key}-${option}`}
        className="mt-0.5"
        checked={details[key].includes(option)}
        disabled={disabled || off}
        onCheckedChange={() => toggle(key, option)}
      />
      <Label
        htmlFor={`${key}-${option}`}
        className={`text-sm font-normal leading-snug ${off ? "text-muted-foreground" : ""}`}
      >
        {option}
      </Label>
    </div>
  );

  const section = (title: string, note: string, children: React.ReactNode) => (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
      {children}
    </div>
  );

  const helpsEating = details.eating.includes(EATING_PARENT);

  return (
    <div className="space-y-4">
      {section(
        "Section I — Client information",
        "Medicaid ID, date of birth and the service plan status are required.",
        <div className="grid gap-4 sm:grid-cols-2">
          {text("medicaid_id", "Medicaid ID", "medicaidId", { required: true })}
          {dateField("dob", "Date of Birth", "dateOfBirth", { required: true })}
          {text("county", "County of Residence", "county")}
          {text("phone", "Telephone Number(s)", "phone")}
          {text("guardian", "Parent(s) / Guardian(s)", "guardianName")}
          {text("mailing", "Complete Mailing Address", "mailingAddress")}
          {choice("Service Plan Status", "planStatus", PLAN_STATUS_OPTIONS, true)}
          {choice("Client Resides", "residesType", RESIDES_OPTIONS)}
          {text("resides_other_1", "Client Resides — Other (describe), line 1", "residesOther1", {
            off: details.residesType !== "Other",
            hint: 'Only used when Client Resides is "Other"',
          })}
          {text("resides_other_2", "Client Resides — Other (describe), line 2", "residesOther2", {
            off: details.residesType !== "Other",
            hint: 'Only used when Client Resides is "Other"',
          })}
          {text("pcp_name", "PCP Name", "pcpName")}
          {text("pcp_id", "PCP Provider ID Number / Taxonomy Code", "pcpProviderId")}
          {dateField("pcp_exam", "Date of Last Exam", "pcpLastExamDate")}
        </div>,
      )}

      {section(
        "Section II — Service location",
        "The street address goes on the Address(es) lines. The describe line is only for \"Other\".",
        <div className="grid gap-4 sm:grid-cols-2">
          {choice("Service Location", "serviceLocationType", SERVICE_LOCATION_OPTIONS)}
          {text("loc_other", "Service Location — Other (describe)", "serviceLocationOther", {
            off: details.serviceLocationType !== "Other",
            hint: 'Only used when Service Location is "Other"',
          })}
          {text("addr1", "Service Location Address(es), line 1", "serviceAddress1", {
            placeholder: "e.g. 2607 W. 28th",
          })}
          {text("addr2", "Service Location Address(es), line 2", "serviceAddress2")}
        </div>,
      )}

      {section(
        "Section III — Dates of service",
        "The original start of care date, current assessment date and assessing RN are required.",
        <div className="grid gap-4 sm:grid-cols-2">
          {dateField("soc_original", "Start of Care Date (original)", "startOfCareOriginal", {
            required: true,
          })}
          {dateField("soc_plan", "Start of Care Date (this service plan)", "startOfCarePlan")}
          {dateField("assessment_date", "Current Assessment Date", "currentAssessmentDate", {
            required: true,
          })}
          {text("assessing_rn", "Assessing RN", "assessingRn", { required: true })}
          {dateField(
            "referral_date",
            "Date of the Order or Referral for Assessment",
            "referralOrderDate",
          )}
        </div>,
      )}

      {section(
        "Section V — Medical diagnoses",
        "The first four print on the form; any beyond that go to the attached continuation page.",
        <div className="space-y-2">
          {details.diagnoses.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[140px_1fr]">
              <Input
                aria-label={`ICD code ${i + 1}`}
                placeholder={`ICD code ${i + 1}`}
                value={row.icd_code}
                disabled={disabled}
                onChange={(e) =>
                  onChange((prev) => {
                    const diagnoses = [...prev.diagnoses];
                    diagnoses[i] = { ...diagnoses[i], icd_code: e.target.value };
                    return { ...prev, diagnoses };
                  })
                }
              />
              <Input
                aria-label={`Diagnosis description ${i + 1}`}
                placeholder="Description"
                value={row.description}
                disabled={disabled}
                onChange={(e) =>
                  onChange((prev) => {
                    const diagnoses = [...prev.diagnoses];
                    diagnoses[i] = { ...diagnoses[i], description: e.target.value };
                    return { ...prev, diagnoses };
                  })
                }
              />
            </div>
          ))}
        </div>,
      )}

      {section(
        "Section VI — Mental status",
        "Check all that apply, and add comments if needed.",
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {MENTAL_STATUS_OPTIONS.map((o) => box(o, "mentalStatus"))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mental_comments">Comments</Label>
            <Textarea
              id="mental_comments"
              rows={3}
              value={details.mentalStatusComments}
              disabled={disabled}
              onChange={(e) => set("mentalStatusComments", e.target.value)}
            />
          </div>
        </div>,
      )}

      {section(
        "Special Administrative Section — procedure codes",
        "Up to three rows print on the form.",
        <div className="space-y-2">
          {details.procedures.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-4">
              {(["code", "hours", "minutes", "frequency"] as const).map((f) => (
                <Input
                  key={f}
                  aria-label={`Row ${i + 1} ${f}`}
                  placeholder={
                    f === "code"
                      ? "Procedure code"
                      : f === "hours"
                        ? "Hours requested"
                        : f === "minutes"
                          ? "Minutes"
                          : "Frequency"
                  }
                  value={row[f]}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange((prev) => {
                      const procedures = [...prev.procedures];
                      procedures[i] = { ...procedures[i], [f]: e.target.value };
                      return { ...prev, procedures };
                    })
                  }
                />
              ))}
            </div>
          ))}
        </div>,
      )}

      {section(
        "Section VII — Physical status and personal care",
        "Check all that apply. The grooming grid takes one level per row.",
        <div className="space-y-4">
          {PHYSICAL_GROUPS.map((g) => (
            <div key={g.group} className="space-y-2">
              <p className="text-sm font-medium">{g.group}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.options.map((o) => box(o, "physical"))}
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <p className="text-sm font-medium">Type of bath</p>
            <div className="flex flex-wrap gap-4">
              {BATHING_TYPE_OPTIONS.map((o) => box(o, "bathingTypes"))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Bathing, dressing, shaving and care of hair</p>
            {GROOMING_ROWS.map((row) => (
              <div key={row} className="grid gap-2 sm:grid-cols-[160px_1fr] sm:items-center">
                <Label className="text-sm font-normal">{row}</Label>
                <Select
                  value={details.grooming[row] || NONE}
                  disabled={disabled}
                  onValueChange={(v) =>
                    onChange((prev) => ({
                      ...prev,
                      grooming: { ...prev.grooming, [row]: v === NONE ? "" : v },
                    }))
                  }
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not selected</SelectItem>
                    {HELP_LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Eating</p>
            {EATING_OPTIONS.map((o) => box(o, "eating"))}
            {EATING_SUB_OPTIONS.map((o) => box(o, "eating", true, !helpsEating))}
            {!helpsEating && (
              <p className="ml-6 text-xs text-muted-foreground">
                These three become available once “Needs help with eating:” is checked.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Preparing meals</p>
            {MEALS_OPTIONS.map((o) => box(o, "meals"))}
          </div>
        </div>,
      )}

      {section(
        "Section VIII — Activities of daily living",
        "One level per activity.",
        <div className="space-y-2">
          {ADL_COLUMNS.map((col) => (
            <div key={col} className="grid gap-2 sm:grid-cols-[160px_1fr] sm:items-center">
              <Label className="text-sm font-normal">{col}</Label>
              <Select
                value={details.adl[col] || NONE}
                disabled={disabled}
                onValueChange={(v) =>
                  onChange((prev) => ({ ...prev, adl: { ...prev.adl, [col]: v === NONE ? "" : v } }))
                }
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not selected</SelectItem>
                  {ADL_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>,
      )}

      {sectionIX}

      {section(
        "Section X — Alternate resources",
        "Resources available to the client other than personal care.",
        <Textarea
          rows={5}
          aria-label="Alternate resources"
          value={details.alternateResources}
          disabled={disabled}
          onChange={(e) => set("alternateResources", e.target.value)}
        />,
      )}

      {section(
        "Section XI — Daily and weekly service time",
        "Maximum and minimum time per day, plus the weekly totals.",
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-2 font-medium">Day</th>
                  {DAY_LABELS.map((d) => (
                    <th key={d} className="py-1 pr-2 font-medium">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["max", "min"] as const).map((kind) => (
                  <tr key={kind}>
                    <td className="py-1 pr-2">{kind === "max" ? "Maximum" : "Minimum"}</td>
                    {DAY_LABELS.map((d, i) => (
                      <td key={d} className="py-1 pr-2">
                        <Input
                          className="h-9 w-16"
                          aria-label={`${kind === "max" ? "Maximum" : "Minimum"} ${d}`}
                          value={details.serviceTime[kind][i] ?? ""}
                          disabled={disabled}
                          onChange={(e) =>
                            onChange((prev) => {
                              const arr = [...prev.serviceTime[kind]];
                              arr[i] = e.target.value;
                              return {
                                ...prev,
                                serviceTime: { ...prev.serviceTime, [kind]: arr },
                              };
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weekly_max">Weekly total — Maximum</Label>
              <Input
                id="weekly_max"
                readOnly
                value={weeklyTotals.weeklyMax}
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Added up from the Maximum row above.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly_min">Weekly total — Minimum</Label>
              <Input
                id="weekly_min"
                readOnly
                value={weeklyTotals.weeklyMin}
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Added up from the Minimum row above.
              </p>
            </div>
          </div>
        </div>,
      )}

      {sectionXII}

      {section(
        "Section XIII — Authorized service plan",
        "The plan text printed above the physician and client signature lines.",
        <Textarea
          rows={6}
          aria-label="Section XIII authorized service plan"
          value={details.sectionXIIIPlan}
          disabled={disabled}
          onChange={(e) => set("sectionXIIIPlan", e.target.value)}
        />,
      )}

      {section(
        "Extension of benefits (page 7)",
        "Page 7 always prints. Fill these three only when an extension is being requested.",
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox
              id="ext_requested"
              className="mt-0.5"
              checked={details.extensionRequested}
              disabled={disabled}
              onCheckedChange={(v) => set("extensionRequested", v === true)}
            />
            <Label htmlFor="ext_requested" className="text-sm font-normal leading-snug">
              An extension of benefits is being requested
            </Label>
          </div>
          {details.extensionRequested && (
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["additional_service_time_increments", "Additional Service-Time Increments Requested"],
                  ["begin_date_of_service", "Begin Date of Service"],
                  ["end_date_of_service", "End Date of Service"],
                ] as const
              ).map(([field, label]) => {
                const isDate = field !== "additional_service_time_increments";
                const setExt = (value: string) =>
                  onChange((prev) => ({
                    ...prev,
                    extension: { ...prev.extension, [field]: value },
                  }));
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field}>{label}</Label>
                    {isDate ? (
                      <DateMaskInput
                        id={field}
                        value={details.extension[field]}
                        disabled={disabled}
                        onChange={setExt}
                      />
                    ) : (
                      <Input
                        id={field}
                        value={details.extension[field]}
                        disabled={disabled}
                        onChange={(e) => setExt(e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>,
      )}
    </div>
  );
}
