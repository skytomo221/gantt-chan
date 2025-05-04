import React, { FC, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Milestone, Schedule, Task, TaskStatus } from "./types";
import { useGlobalStateStore } from './contexts/globalStateContext';

export const GanttChart: FC = () => {
  const svgRef = useRef<SVGSVGElement>(null)
  const { schedule, editable } = useGlobalStateStore();

  useEffect(() => {
    drawChart(svgRef, schedule.tasks, editable)
  }, [svgRef, schedule, editable])

  const handleDownload = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gantt-chart.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <button onClick={handleDownload}>画像として保存</button>
      <div style={{ overflowX: 'auto' }}>
        <svg ref={svgRef} />
      </div>
    </div>
  )
}

function drawChart(
  svgRef: React.RefObject<SVGSVGElement | null>,
  tasks: Task[],
  editable: boolean
) {
  if (!svgRef.current) return;

  // 1. コンテキストの初期化（サイズ計算・SVGクリア・スケール作成）
  const ctx = initChartContext(svgRef.current, tasks)

  // 2. ズーム＆パン設定
  setupZoomPan(d3.select(svgRef.current), ctx.g, ctx.xScale, ctx)

  // 3. ヘッダー（月・日）描画
  drawMonths(ctx.g, ctx.monthData, ctx)
  drawDays(ctx.g, ctx.dayData, ctx)

  // 4. ツールチップ準備
  const tooltip = setupTooltip()

  // 5. タスク描画
  drawTasks(ctx.g, tasks, ctx, editable, tooltip)

  // 6. 進捗線描画
  updateProgressLine(ctx.g, tasks, ctx.xScale, ctx.rowHeight)
}

// --- ヘルパー関数群 ---

// 1. コンテキスト初期化
function initChartContext(svgEl: SVGSVGElement, tasks: Task[]) {
  const margin = { top: 60, right: 20, bottom: 20, left: 50 }
  const rowHeight = 30
  const dayMs = 24 * 60 * 60 * 1000
  const dayWidth = 40

  const dateList = [
    ...tasks.filter(t => t.status !== "milestone").flatMap(t => [t.scheduledStartDate, t.scheduledEndDate]),
    ...tasks.filter(t => t.status === "milestone").flatMap(t => [t.scheduledDate, t.actualDate!]),
    ...tasks.filter(t => t.status === "active").map(t => t.actualStartDate),
    ...tasks.filter(t => t.status === "done").flatMap(t => [t.actualStartDate, t.actualEndDate!]),
  ]
  const minDate = d3.min(dateList, d => d)!  
  const maxDate = d3.max(dateList, d => d)!  
  const totalDays = (maxDate.getTime() - minDate.getTime()) / dayMs

  // チャートの幅を「日数×dayWidth」で計算
  const chartWidth = totalDays * dayWidth
  const svgWidth = chartWidth + margin.left + margin.right
  const svgHeight = margin.top + tasks.length * rowHeight + margin.bottom

  // 描画領域をクリアしてサイズを設定
  const svg = d3.select(svgEl)
    .attr("width", svgWidth)
    .attr("height", svgHeight)
  svg.selectAll("*").remove()

  // スケールは chartWidth をレンジに
  const xScale = d3.scaleTime()
    .domain([minDate, maxDate])
    .range([0, chartWidth])

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  const monthData = d3.timeMonths(d3.timeMonth.floor(minDate), d3.timeMonth.offset(maxDate, 1))
  const dayData = d3.timeDays(d3.timeDay.floor(minDate), d3.timeDay.offset(maxDate, 1))

  // ★ chartWidth, svgHeight を返却オブジェクトに追加
  return { svg, g, margin, rowHeight, dayMs, dayWidth, xScale, monthData, dayData, tasks, chartWidth, svgHeight }
}

// 2. ズーム＆パン
function setupZoomPan(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleTime<number, number>,
  ctx: ReturnType<typeof initChartContext>
) {
  const { chartWidth, svgHeight, margin, tasks, rowHeight } = ctx

  // 1. ズーム動作の定義
  const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 3])
    // Y 軸も svgHeight まで許可
    .translateExtent([[0, 0], [chartWidth, svgHeight]])
    .extent([[0, 0], [chartWidth, svgHeight]])
    .on("zoom", (event) => {
      const newX = event.transform.rescaleX(xScale)
      drawMonths(g, ctx.monthData, { ...ctx, xScale: newX })
      drawDays(g, ctx.dayData, { ...ctx, xScale: newX })
      // タスクバーと進捗線更新
      g.selectAll<SVGRectElement, any>(".task-bar")
        .filter((d): d is Exclude<Task, Milestone> => d.status !== "milestone")
        .attr("x", d => newX(d.scheduledStartDate))
        .attr("width", d => newX(d.scheduledEndDate) - newX(d.scheduledStartDate))
      updateProgressLine(g, tasks, newX, rowHeight)
    })

  svg.call(zoomBehavior).on("dblclick.zoom", null)

  // 2. 既存の pan-rect があれば先に削除
  g.selectAll(".pan-rect").remove()

  // 3. カスタムパン用ドラッグ領域
  let currentTranslateX = 0
  g.insert("rect", ":first-child")
    .attr("class", "pan-rect")
    .attr("x", 0)
    .attr("y", -margin.top)
    .attr("width", chartWidth)
    .attr("height", svgHeight)
    .style("fill", "transparent")
    .style("cursor", "grab")
    .call(d3.drag<SVGRectElement, unknown>()
      .on("start", () => g.style("cursor", "grabbing"))
      .on("drag", (event) => {
        currentTranslateX += event.dx
        g.attr("transform", `translate(${margin.left + currentTranslateX},${margin.top})`)
      })
      .on("end", () => g.style("cursor", "grab"))
    )
}

// 3-4. ヘッダー描画
function drawMonths(g: any, data: Date[], ctx: any) {
  const scale = ctx.xScale, margin = ctx.margin
  const sel: d3.Selection<SVGRectElement, Date, SVGGElement, unknown> = g.selectAll(".month-rect").data(data)
  sel.exit().remove()
  sel.enter().append("rect").attr("class", "month-rect")
    .merge(sel)
    .attr("x", d => scale(d))
    .attr("y", -margin.top)
    .attr("width", d => scale(d3.timeMonth.offset(d, 1)) - scale(d))
    .attr("height", 20)
    .attr("fill", "#bbb")
  const txt: d3.Selection<SVGTextElement, Date, SVGGElement, unknown> = g.selectAll(".month-text").data(data)
  txt.exit().remove()
  txt.enter().append("text").attr("class", "month-text")
    .merge(txt)
    .attr("x", d => scale(d) + 5)
    .attr("y", -margin.top + 15)
    .text(d3.timeFormat("%Y年%-m月"))
    .attr("font-size", "12px")
}
function drawDays(g: any, data: Date[], ctx: any) {
  const scale = ctx.xScale, margin = ctx.margin, rowHeight = ctx.rowHeight, tasks = ctx.tasks
  const sel: d3.Selection<SVGRectElement, Date, SVGGElement, unknown> = g.selectAll(".day-rect").data(data)
  sel.exit().remove()
  const enter = sel.enter().append("rect").attr("class", "day-rect")
  enter.merge(sel)
    .attr("x", d => scale(d))
    .attr("y", -margin.top + 20)
    .attr("width", d => scale(d3.timeDay.offset(d, 1)) - scale(d))
    .attr("height", 20)
    .attr("fill", "#ddd")
  const txt = g.selectAll(".day-text").data(data) as d3.Selection<SVGTextElement, Date, SVGGElement, unknown>
  txt.exit().remove()
  const txtEnter = txt.enter().append("text").attr("class", "day-text")
  txtEnter.merge(txt)
    .attr("x", d => scale(d) + 2)
    .attr("y", -margin.top + 35)
    .text(d3.timeFormat("%-d"))
    .attr("font-size", "10px")
  const line: d3.Selection<SVGLineElement, Date, SVGGElement, unknown> = g.selectAll(".grid-line").data(data)
  line.exit().remove()
  const lineEnter = line.enter().append("line").attr("class", "grid-line")
  lineEnter.merge(line)
    .attr("x1", d => scale(d))
    .attr("y1", 0)
    .attr("x2", d => scale(d))
    .attr("y2", tasks.length * rowHeight)
    .attr("stroke", "#aaa")
    .attr("stroke-width", 0.5)
}

// ツールチップ
function setupTooltip() {
  d3.selectAll('.tooltip').remove()
  return d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('background', '#fff')
    .style('border', '1px solid #ccc')
    .style('padding', '5px')
    .style('opacity', 0)
}

// 5. タスク描画
function drawTasks(
  g: any,
  tasks: Task[],
  ctx: any,
  editable: boolean,
  tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>
) {
  const { xScale, rowHeight, dayWidth, dayMs } = ctx
  tasks.filter(t => t.status !== "milestone").forEach((task, i) => {
    const y = i * rowHeight
    const gTask = g.append('g').attr('transform', `translate(0,${y})`)

    // ラベル
    gTask.append('text')
      .attr('x', -10)
      .attr('y', rowHeight / 2 + 3)
      .attr('text-anchor', 'end')
      .attr('font-size', '12px')
      .text(task.taskName)

    const x0 = xScale(task.scheduledStartDate)
    const w0 = xScale(task.scheduledEndDate) - x0

    // メインバー
    const bar = gTask.append('rect')
      .datum(task)
      .attr('x', x0)
      .attr('y', 5)
      .attr('width', w0)
      .attr('height', rowHeight - 10)
      .attr('fill', 'steelblue')
      .style('cursor', editable ? 'pointer' : 'default')
      .attr('class', 'task-bar')

    // ツールチップ
    bar.on('mouseover', (event: MouseEvent) => {
      tooltip.html(
        `<strong>${task.taskName}</strong><br>` +
        `開始: ${task.scheduledStartDate.toLocaleDateString()}<br>` +
        `終了: ${task.scheduledEndDate.toLocaleDateString()}<br>` +
        `進捗: ${task.progress}%`
      )
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY + 10) + 'px')
        .style('opacity', 1)
    })
      .on('mousemove', (event: MouseEvent) => {
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY + 10) + 'px')
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0)
      })

    if (editable) {
      // 開始リサイズ
      gTask.append('rect')
        .attr('x', x0 - 5)
        .attr('y', 5)
        .attr('width', 10)
        .attr('height', rowHeight - 10)
        .style('fill', 'transparent')
        .style('cursor', 'ew-resize')
        .call(d3.drag<SVGRectElement, any>()
          .on('drag', (event) => {
            const dx = event.x
            const dayOffset = Math.round(dx / dayWidth)
            const newStart = new Date(task.scheduledStartDate.getTime() + dayOffset * dayMs)
            if (newStart < task.scheduledEndDate) {
              task.scheduledStartDate = newStart
              const x1 = xScale(newStart)
              const w1 = xScale(task.scheduledEndDate) - x1
              bar.attr('x', x1).attr('width', w1)
              updateProgressLine(ctx.g, tasks, xScale, ctx.rowHeight)
            }
          })
        )

      // 終了リサイズ
      gTask.append('rect')
        .attr('x', x0 + w0 - 5)
        .attr('y', 5)
        .attr('width', 10)
        .attr('height', rowHeight - 10)
        .style('fill', 'transparent')
        .style('cursor', 'ew-resize')
        .call(d3.drag<SVGRectElement, any>()
          .on('drag', (event) => {
            const dx = event.x - x0
            const dayCount = Math.max(1, Math.round(dx / dayWidth))
            task.scheduledEndDate = new Date(task.scheduledStartDate.getTime() + dayCount * dayMs)
            bar.attr('width', dayWidth * dayCount)
            updateProgressLine(ctx.g, tasks, xScale, ctx.rowHeight)
          })
        )
    }
  })
}

// 6. 進捗線
function updateProgressLine(
  g: any,
  tasks: Task[],
  scale: d3.ScaleTime<number, number>,
  rowHeight: number
) {
  g.selectAll("polyline").remove()
  const pts = tasks.map((t, i) => {
    let progX: number
    switch (t.status) {
      case "new":
        progX = t.scheduledStartDate <= new Date()
          ? scale(t.scheduledStartDate)
          : scale(new Date())
        break
      case "active":
        progX = scale(t.actualStartDate)
        break
      case "milestone":
        progX = t.scheduledDate <= new Date()
          ? scale(t.scheduledDate)
          : scale(new Date())
        break
      case "done":
      default:
        progX = scale(new Date())
        break
    }
    const progY = i * rowHeight + rowHeight / 2
    return [progX, progY] as [number, number]
  })
  g.append("polyline")
    .attr("points", pts.map(p => p.join(",")).join(" "))
    .attr("fill", "none")
    .attr("stroke", "orange")
    .attr("stroke-width", 2)
}
