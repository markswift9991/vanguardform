import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { RiderHeader } from "@/components/RiderHeader";
import { RiderForm, type RiderFormValues } from "@/components/RiderForm";
import { SuccessScreen, type GuarantorLinkInfo } from "@/components/SuccessScreen";
import { GuarantorForm } from "@/components/GuarantorForm";
import type { GuarantorSubmission } from "@/types";
import { Truck, Loader2, AlertCircle } from "lucide-react";

type View = "rider" | "success" | "guarantor" | "guarantor-used" | "guarantor-error";

interface GuarantorContext {
  token: string;
  riderName: string;
  guarantorName: string;
  guarantorPhone: string;
  guarantorId: string;
}

function App() {
  const [view, setView] = useState<View>("rider");
  const [links, setLinks] = useState<GuarantorLinkInfo[]>([]);
  const [riderName, setRiderName] = useState("");
  const [guarantorCtx, setGuarantorCtx] = useState<GuarantorContext | null>(null);
  const [loadingGuarantor, setLoadingGuarantor] = useState(false);

  // Route detection: #/guarantor/<token> or ?guarantor=<token>
  const detectGuarantorRoute = useCallback(async () => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    let token: string | null = null;

    const match = hash.match(/#\/guarantor\/([0-9a-fA-F-]+)/);
    if (match) token = match[1];
    else if (params.get("guarantor")) token = params.get("guarantor");

    if (!token) return;

    setLoadingGuarantor(true);
    try {
      const { data, error } = await supabase
        .from("guarantors")
        .select("id, name, phone_number, status, verification_token, riders(full_name)")
        .eq("verification_token", token)
        .maybeSingle();

      if (error || !data) {
        setView("guarantor-error");
        return;
      }

      if (data.status !== "pending") {
        setView("guarantor-used");
        return;
      }

      const riderNameValue = (data.riders as unknown as { full_name: string }).full_name;
      setGuarantorCtx({
        token: data.verification_token,
        riderName: riderNameValue,
        guarantorName: data.name,
        guarantorPhone: data.phone_number,
        guarantorId: data.id,
      });
      setView("guarantor");
    } catch {
      setView("guarantor-error");
    } finally {
      setLoadingGuarantor(false);
    }
  }, []);

  useEffect(() => {
    detectGuarantorRoute();
  }, [detectGuarantorRoute]);

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("rider-uploads").upload(path, file, { upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return path;
  };

  const handleRiderSubmit = async (vals: RiderFormValues) => {
    // Upload NIN document
    let ninDocPath: string | undefined;
    if (vals.nin_document) {
      ninDocPath = await uploadFile(vals.nin_document, "nin-documents");
    }
    // Upload verification video
    let videoPath: string | undefined;
    if (vals.video) {
      videoPath = await uploadFile(vals.video, "verification-videos");
    }

    // Insert rider
    const { data: rider, error: riderErr } = await supabase
      .from("riders")
      .insert({
        full_name: vals.full_name,
        phone_number: vals.phone_number,
        residential_address: vals.residential_address,
        emergency_contact_name: vals.emergency_contact_name,
        emergency_contact_phone: vals.emergency_contact_phone,
        skills_experience: vals.skills_experience,
        nin: vals.nin,
        nin_document_path: ninDocPath,
        video_path: videoPath,
      })
      .select("id")
      .single();

    if (riderErr || !rider) throw new Error("Failed to save rider profile. Please try again.");

    // Insert guarantors with auto-generated single-use tokens
    const guarantorRows = [
      { rider_id: rider.id, name: vals.guarantor1.name, phone_number: vals.guarantor1.phone_number },
      { rider_id: rider.id, name: vals.guarantor2.name, phone_number: vals.guarantor2.phone_number },
    ];

    const { data: guarantorData, error: guarantorErr } = await supabase
      .from("guarantors")
      .insert(guarantorRows)
      .select("id, name, phone_number, verification_token");

    if (guarantorErr || !guarantorData) throw new Error("Failed to generate guarantor links. Please try again.");

    const origin = window.location.origin + window.location.pathname;
    const linkInfos: GuarantorLinkInfo[] = guarantorData.map((g) => ({
      guarantorName: g.name,
      guarantorPhone: g.phone_number,
      riderName: vals.full_name,
      link: `${origin}#/guarantor/${g.verification_token}`,
    }));

    setLinks(linkInfos);
    setRiderName(vals.full_name);
    setView("success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGuarantorSubmit = async (submission: GuarantorSubmission) => {
    if (!guarantorCtx) return;

    // Upload guarantor NIN document
    let ninDocPath: string | undefined;
    if (submission.nin_document) {
      ninDocPath = await uploadFile(submission.nin_document, "guarantor-nin-documents");
    }

    // Upload guarantor video declaration
    let videoPath: string | undefined;
    if (submission.video) {
      videoPath = await uploadFile(submission.video, "guarantor-videos");
    }

    const { error } = await supabase
      .from("guarantors")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        guarantor_address: submission.guarantor_address,
        guarantor_phone_confirmed: submission.guarantor_phone,
        relationship: submission.relationship,
        occupation: submission.occupation,
        nin: submission.nin,
        nin_document_path: ninDocPath,
        video_path: videoPath,
        digital_signature: submission.digital_signature,
        confirmation: submission.confirmation,
      })
      .eq("id", guarantorCtx.guarantorId)
      .eq("verification_token", guarantorCtx.token)
      .eq("status", "pending"); // double check still pending — prevents reuse

    if (error) throw new Error("Could not submit verification. Please try again.");
  };

  const handleNewApplication = () => {
    setView("rider");
    setLinks([]);
    setRiderName("");
    window.location.hash = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ===== Renders =====

  if (loadingGuarantor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (view === "guarantor-error") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">Link Not Found</h1>
          <p className="mt-2 text-sm text-slate-500">
            This guarantor verification link is invalid or has expired. Please contact the rider or
            Vanguard Velocity Delivery for assistance.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-slate-400">
            <Truck className="h-4 w-4" /> Vanguard Velocity Delivery
          </div>
        </div>
      </div>
    );
  }

  if (view === "guarantor-used") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <AlertCircle className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">Link Already Used</h1>
          <p className="mt-2 text-sm text-slate-500">
            This guarantor verification link has already been submitted. Each link is single-use. If you
            believe this is an error, please contact Vanguard Velocity Delivery.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-slate-400">
            <Truck className="h-4 w-4" /> Vanguard Velocity Delivery
          </div>
        </div>
      </div>
    );
  }

  if (view === "guarantor" && guarantorCtx) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="mx-auto max-w-xl">
          <GuarantorForm
            token={guarantorCtx.token}
            riderName={guarantorCtx.riderName}
            guarantorName={guarantorCtx.guarantorName}
            guarantorPhone={guarantorCtx.guarantorPhone}
            onSubmit={handleGuarantorSubmit}
          />
        </div>
      </div>
    );
  }

  if (view === "success") {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <SuccessScreen riderName={riderName} links={links} onNewApplication={handleNewApplication} />
      </div>
    );
  }

  // Default: rider form
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-5">
        <RiderHeader />
        <RiderForm onSubmit={handleRiderSubmit} />
      </div>
    </div>
  );
}

export default App;
