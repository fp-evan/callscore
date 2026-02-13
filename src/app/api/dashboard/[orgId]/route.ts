import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  subDays,
  startOfWeek,
  format,
  differenceInDays,
  startOfMonth,
} from "date-fns";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  if (!UUID_RE.test(orgId)) {
    return NextResponse.json({ error: "Invalid org ID" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const endDate = searchParams.get("endDate")
    ? new Date(searchParams.get("endDate")!)
    : now;
  const startDate = searchParams.get("startDate")
    ? new Date(searchParams.get("startDate")!)
    : subDays(now, 30);
  const technicianIds = searchParams.get("technicianIds")
    ? searchParams.get("technicianIds")!.split(",").filter((id) => UUID_RE.test(id))
    : null;
  const criteriaIds = searchParams.get("criteriaIds")
    ? searchParams.get("criteriaIds")!.split(",").filter((id) => UUID_RE.test(id))
    : null;
  const excludeMock = searchParams.get("excludeMock") !== "false";

  const supabase = createServerClient();

  try {
    // Fetch technicians and criteria for the org
    const [techResult, criteriaResult] = await Promise.all([
      supabase
        .from("technicians")
        .select("id, name")
        .eq("organization_id", orgId)
        .order("name"),
      supabase
        .from("eval_criteria")
        .select("id, name, category, target_pass_rate")
        .eq("organization_id", orgId)
        .eq("status", "published")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

    const technicians = techResult.data || [];
    const criteria = criteriaResult.data || [];

    // Build transcript query for current period
    let transcriptQuery = supabase
      .from("transcripts")
      .select("id, technician_id, source, service_type, eval_status, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (excludeMock) {
      transcriptQuery = transcriptQuery.neq("source", "mock");
    }
    if (technicianIds && technicianIds.length > 0) {
      transcriptQuery = transcriptQuery.in("technician_id", technicianIds);
    }

    const { data: transcripts } = await transcriptQuery;
    const allTranscripts = transcripts || [];

    // Fetch eval results for completed transcripts
    const completedIds = allTranscripts
      .filter((t) => t.eval_status === "completed")
      .map((t) => t.id);

    let evalResults: Array<{
      id: string;
      transcript_id: string;
      eval_criteria_id: string;
      passed: boolean | null;
      created_at: string;
    }> = [];

    if (completedIds.length > 0) {
      const { data: results } = await supabase
        .from("eval_results")
        .select("id, transcript_id, eval_criteria_id, passed, created_at")
        .in("transcript_id", completedIds);
      evalResults = results || [];
    }

    // Filter eval results by criteria if filter is applied
    const filteredResults = criteriaIds
      ? evalResults.filter((r) => criteriaIds.includes(r.eval_criteria_id))
      : evalResults;

    // ======== OVERVIEW ========
    const totalTranscripts = allTranscripts.length;
    const totalResults = filteredResults.length;
    const totalPassed = filteredResults.filter((r) => r.passed === true).length;
    const overallPassRate = totalResults > 0 ? totalPassed / totalResults : null;

    // Previous period for comparison
    const periodLength = differenceInDays(endDate, startDate);
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevStart = subDays(prevEnd, periodLength);

    let prevTranscriptQuery = supabase
      .from("transcripts")
      .select("id, technician_id, eval_status")
      .eq("organization_id", orgId)
      .gte("created_at", prevStart.toISOString())
      .lte("created_at", prevEnd.toISOString());

    if (excludeMock) {
      prevTranscriptQuery = prevTranscriptQuery.neq("source", "mock");
    }
    if (technicianIds && technicianIds.length > 0) {
      prevTranscriptQuery = prevTranscriptQuery.in("technician_id", technicianIds);
    }

    const { data: prevTranscripts } = await prevTranscriptQuery;
    const prevCompletedIds = (prevTranscripts || [])
      .filter((t) => t.eval_status === "completed")
      .map((t) => t.id);

    let prevEvalResults: Array<{
      transcript_id: string;
      eval_criteria_id: string;
      passed: boolean | null;
    }> = [];

    if (prevCompletedIds.length > 0) {
      const { data: prevResults } = await supabase
        .from("eval_results")
        .select("transcript_id, eval_criteria_id, passed")
        .in("transcript_id", prevCompletedIds);
      prevEvalResults = prevResults || [];
    }

    const filteredPrevResults = criteriaIds
      ? prevEvalResults.filter((r) => criteriaIds.includes(r.eval_criteria_id))
      : prevEvalResults;

    const prevTotalResults = filteredPrevResults.length;
    const prevTotalPassed = filteredPrevResults.filter((r) => r.passed === true).length;
    const prevPassRate = prevTotalResults > 0 ? prevTotalPassed / prevTotalResults : null;
    const passRateChange =
      overallPassRate !== null && prevPassRate !== null
        ? overallPassRate - prevPassRate
        : null;

    // ======== CRITERIA PASS RATES ========
    const criteriaPassRates = criteria.map((c) => {
      const results = filteredResults.filter((r) => r.eval_criteria_id === c.id);
      const passed = results.filter((r) => r.passed === true).length;
      return {
        criteriaId: c.id,
        criteriaName: c.name,
        category: c.category,
        passRate: results.length > 0 ? passed / results.length : null,
        totalEvals: results.length,
        targetPassRate: c.target_pass_rate ?? 0.8,
      };
    });

    // Weakest criterion
    const evaluatedCriteria = criteriaPassRates.filter(
      (c) => c.totalEvals > 0 && c.passRate !== null
    );
    const weakestCriterion =
      evaluatedCriteria.length > 0
        ? evaluatedCriteria.reduce((worst, c) =>
            c.passRate! < worst.passRate! ? c : worst
          )
        : null;

    // ======== TECHNICIAN COMPARISON ========
    const techComparison = technicians.map((tech) => {
      const techTranscriptIds = allTranscripts
        .filter(
          (t) =>
            t.technician_id === tech.id && t.eval_status === "completed"
        )
        .map((t) => t.id);

      const techResults = filteredResults.filter((r) =>
        techTranscriptIds.includes(r.transcript_id)
      );

      const techPassed = techResults.filter((r) => r.passed === true).length;
      const overallRate =
        techResults.length > 0 ? techPassed / techResults.length : null;

      const criteriaBreakdown = criteria.map((c) => {
        const cResults = techResults.filter(
          (r) => r.eval_criteria_id === c.id
        );
        const cPassed = cResults.filter((r) => r.passed === true).length;
        return {
          criteriaId: c.id,
          criteriaName: c.name,
          passRate: cResults.length > 0 ? cPassed / cResults.length : null,
        };
      });

      return {
        technicianId: tech.id,
        technicianName: tech.name,
        overallPassRate: overallRate,
        criteriaBreakdown,
      };
    });

    // Most improved technician (current vs previous period)
    let mostImprovedTechnician: {
      id: string;
      name: string;
      improvement: number;
    } | null = null;

    if (technicians.length > 0 && prevCompletedIds.length > 0) {
      let maxImprovement = -Infinity;

      for (const tech of technicians) {
        // Current period
        const currentTechTranscripts = allTranscripts
          .filter(
            (t) =>
              t.technician_id === tech.id && t.eval_status === "completed"
          )
          .map((t) => t.id);
        const currentTechResults = filteredResults.filter((r) =>
          currentTechTranscripts.includes(r.transcript_id)
        );
        if (currentTechResults.length === 0) continue;
        const currentRate =
          currentTechResults.filter((r) => r.passed === true).length /
          currentTechResults.length;

        // Previous period
        const prevTechTranscripts = (prevTranscripts || [])
          .filter(
            (t) =>
              t.technician_id === tech.id && t.eval_status === "completed"
          )
          .map((t) => t.id);
        const prevTechResults = filteredPrevResults.filter((r) =>
          prevTechTranscripts.includes(r.transcript_id)
        );
        if (prevTechResults.length === 0) continue;
        const prevRate =
          prevTechResults.filter((r) => r.passed === true).length /
          prevTechResults.length;

        const improvement = currentRate - prevRate;
        if (improvement > maxImprovement) {
          maxImprovement = improvement;
          mostImprovedTechnician = {
            id: tech.id,
            name: tech.name,
            improvement,
          };
        }
      }
    }

    // ======== HEATMAP DATA ========
    const heatmapData = technicians.flatMap((tech) => {
      return criteria.map((c) => {
        const techTranscriptIds = allTranscripts
          .filter(
            (t) =>
              t.technician_id === tech.id && t.eval_status === "completed"
          )
          .map((t) => t.id);
        const results = filteredResults.filter(
          (r) =>
            techTranscriptIds.includes(r.transcript_id) &&
            r.eval_criteria_id === c.id
        );
        const passed = results.filter((r) => r.passed === true).length;
        return {
          technicianId: tech.id,
          technicianName: tech.name,
          criteriaId: c.id,
          criteriaName: c.name,
          passRate: results.length > 0 ? passed / results.length : null,
        };
      });
    });

    // ======== TREND DATA ========
    const useMonthly = periodLength > 90;
    const trendMap = new Map<
      string,
      {
        passed: number;
        total: number;
        techData: Map<string, { passed: number; total: number }>;
      }
    >();

    for (const result of filteredResults) {
      const resultDate = new Date(result.created_at);
      const periodKey = useMonthly
        ? format(startOfMonth(resultDate), "yyyy-MM-dd")
        : format(startOfWeek(resultDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

      if (!trendMap.has(periodKey)) {
        trendMap.set(periodKey, {
          passed: 0,
          total: 0,
          techData: new Map(),
        });
      }
      const bucket = trendMap.get(periodKey)!;
      bucket.total++;
      if (result.passed === true) bucket.passed++;

      // Find which technician this result belongs to
      const transcript = allTranscripts.find(
        (t) => t.id === result.transcript_id
      );
      if (transcript?.technician_id) {
        const techId = transcript.technician_id;
        if (!bucket.techData.has(techId)) {
          bucket.techData.set(techId, { passed: 0, total: 0 });
        }
        const techBucket = bucket.techData.get(techId)!;
        techBucket.total++;
        if (result.passed === true) techBucket.passed++;
      }
    }

    const trendData = [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({
        period,
        overallPassRate: data.total > 0 ? data.passed / data.total : null,
        technicianTrends: technicians
          .map((tech) => {
            const techData = data.techData.get(tech.id);
            return {
              technicianId: tech.id,
              name: tech.name,
              passRate:
                techData && techData.total > 0
                  ? techData.passed / techData.total
                  : null,
            };
          })
          .filter((t) => t.passRate !== null),
      }));

    // ======== NEEDS ATTENTION ========
    const transcriptPassRates = completedIds.map((tId) => {
      const results = filteredResults.filter((r) => r.transcript_id === tId);
      const passed = results.filter((r) => r.passed === true).length;
      const total = results.length;
      const transcript = allTranscripts.find((t) => t.id === tId)!;
      const tech = technicians.find(
        (t) => t.id === transcript.technician_id
      );
      return {
        transcriptId: tId,
        technicianName: tech?.name || "Unknown",
        date: transcript.created_at,
        serviceType: transcript.service_type,
        passRate: total > 0 ? passed / total : null,
        passed,
        total,
      };
    });

    const needsAttention = transcriptPassRates
      .filter((t) => t.passRate !== null && t.passRate < 0.5)
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 10);

    // ======== SPARKLINE DATA (daily counts for cards) ========
    const dailyMap = new Map<string, { passed: number; total: number; transcripts: number }>();
    for (const t of allTranscripts) {
      const day = format(new Date(t.created_at), "yyyy-MM-dd");
      if (!dailyMap.has(day)) {
        dailyMap.set(day, { passed: 0, total: 0, transcripts: 0 });
      }
      dailyMap.get(day)!.transcripts++;
    }
    for (const r of filteredResults) {
      const day = format(new Date(r.created_at), "yyyy-MM-dd");
      if (!dailyMap.has(day)) {
        dailyMap.set(day, { passed: 0, total: 0, transcripts: 0 });
      }
      dailyMap.get(day)!.total++;
      if (r.passed === true) dailyMap.get(day)!.passed++;
    }

    const sparklineData = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        passRate: data.total > 0 ? data.passed / data.total : null,
        evaluations: data.total,
        transcripts: data.transcripts,
      }));

    return NextResponse.json({
      overview: {
        totalTranscripts,
        totalEvaluations: totalResults,
        overallPassRate,
        passRateChange,
        mostImprovedTechnician,
        weakestCriterion: weakestCriterion
          ? {
              id: weakestCriterion.criteriaId,
              name: weakestCriterion.criteriaName,
              failRate:
                weakestCriterion.passRate !== null
                  ? 1 - weakestCriterion.passRate
                  : null,
            }
          : null,
      },
      criteriaPassRates,
      technicianComparison: techComparison,
      heatmapData,
      trendData,
      needsAttention,
      sparklineData,
      // Include metadata for filters
      availableTechnicians: technicians,
      availableCriteria: criteria.map((c) => ({ id: c.id, name: c.name })),
    });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
