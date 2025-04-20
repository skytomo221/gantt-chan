import React, { FC, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Milestone, Schedule, Task, TaskStatus } from "./types";

interface GanttChartProps {
  schedule: Schedule;
  editable?: boolean;
}

export const GanttChart: FC<GanttChartProps> = ({ schedule, editable = true }) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    drawChart(svgRef, schedule, editable)
  }, [svgRef, schedule, editable])

  return <svg ref={svgRef} width="100%" />
}

function drawChart(
  svgRef: React.RefObject<SVGSVGElement | null>,
  { tasks }: Schedule,
  editable: boolean = true
) {
  if (!svgRef.current) return

  const margin = { top: 60, right: 20, bottom: 20, left: 50 }
  const rowHeight = 30
  const dayMs = 24 * 60 * 60 * 1000

  const svgWidth = svgRef.current.clientWidth
  const svgHeight = margin.top + tasks.length * rowHeight + margin.bottom
  const width = svgWidth - margin.left - margin.right

  const dateList = [
    ...tasks
      .filter(t => t.status !== "milestone")
      .map(t => t.scheduledStartDate),
    ...tasks
      .filter(t => t.status !== "milestone")
      .map(t => t.scheduledEndDate),
    ...tasks
      .filter(t => t.status === "active")
      .map(t => t.actualStartDate),
    ...tasks
      .filter(t => t.status === "done")
      .map(t => t.actualStartDate),
    ...tasks
      .filter(t => t.status === "done")
      .map(t => t.actualEndDate),
    ...tasks
      .filter(t => t.status === "milestone")
      .map(t => t.scheduledDate),
    ...tasks
      .filter(t => t.status === "milestone")
      .map(t => t.actualDate),
  ]
  const minDate = d3.min(dateList, d => d)!
  const maxDate = d3.max(dateList, d => d)!
  const totalDays = (maxDate.getTime() - minDate.getTime()) / dayMs
  const cellWidth = width / totalDays

  d3.select(svgRef.current).selectAll("*").remove()
  const svg = d3.select(svgRef.current).attr("height", svgHeight)
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  // ── 横軸のみズーム設定 ──
  const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 3])
    .translateExtent([[0, 0], [width, 0]])
    .extent([[0, 0], [width, 0]])
    .on("zoom", (event) => {
      // event.transform から再スケールした xScale を取得
      const newX = event.transform.rescaleX(xScale)
      // 月・日ヘッダーを再描画
      drawMonths(newX)
      drawDays(newX)
      // タスクバー位置も更新
      g.selectAll<SVGRectElement, Exclude<Task, Milestone>>(".task-bar")
        .attr("x", d => newX(d.scheduledStartDate))
        .attr("width", d => newX(d.scheduledEndDate) - newX(d.scheduledStartDate))
      // 進捗線も更新
      updateProgressLine(newX)
    })

  svg.call(zoomBehavior)
    .on("dblclick.zoom", null)  // ダブルクリックズームを無効化（任意）

  const xScale = d3
    .scaleTime()
    .domain([minDate, maxDate])
    .range([0, width])

  // ── 再描画用ヘルパー ──
  // 月ヘッダーと日ヘッダーをそれぞれ再描画する関数を用意
  const monthData = d3.timeMonths(d3.timeMonth.floor(minDate), d3.timeMonth.offset(maxDate, 1))
  const dayData = d3.timeDays(d3.timeDay.floor(minDate), d3.timeDay.offset(maxDate, 1))
  function drawMonths(scale: d3.ScaleTime<number, number>) {
    const sel = g.selectAll<SVGRectElement, Date>(".month-rect").data(monthData)
    sel.exit().remove()
    const enter = sel.enter().append("rect").attr("class", "month-rect")
    enter.merge(sel)
      .attr("x", d => scale(d))
      .attr("y", -margin.top)
      .attr("width", d => scale(d3.timeMonth.offset(d, 1)) - scale(d))
      .attr("height", 20)
      .attr("fill", "#bbb")
    const txt = g.selectAll<SVGTextElement, Date>(".month-text").data(monthData)
    txt.exit().remove()
    const txtEnter = txt.enter().append("text").attr("class", "month-text")
    txtEnter.merge(txt)
      .attr("x", d => scale(d) + 5)
      .attr("y", -margin.top + 15)
      .text(d3.timeFormat("%Y年%-m月"))
      .attr("font-size", "12px")
  }
  function drawDays(scale: d3.ScaleTime<number, number>) {
    const sel = g.selectAll<SVGRectElement, Date>(".day-rect").data(dayData)
    sel.exit().remove()
    const enter = sel.enter().append("rect").attr("class", "day-rect")
    enter.merge(sel)
      .attr("x", d => scale(d))
      .attr("y", -margin.top + 20)
      .attr("width", d => scale(d3.timeDay.offset(d, 1)) - scale(d))
      .attr("height", 20)
      .attr("fill", "#ddd")
    const txt = g.selectAll<SVGTextElement, Date>(".day-text").data(dayData)
    txt.exit().remove()
    const txtEnter = txt.enter().append("text").attr("class", "day-text")
    txtEnter.merge(txt)
      .attr("x", d => scale(d) + 2)
      .attr("y", -margin.top + 35)
      .text(d3.timeFormat("%-d"))
      .attr("font-size", "10px")
    const line = g.selectAll<SVGLineElement, Date>(".grid-line").data(dayData)
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
  // 初回描画
  drawMonths(xScale)
  drawDays(xScale)

  // ツールチップ
  d3.selectAll('.tooltip').remove()
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('background', '#fff')
    .style('border', '1px solid #ccc')
    .style('padding', '5px')
    .style('opacity', 0)

  // パン用の変数
  let currentTranslateX = 0

  // 背景キャプチャ用の透明な矩形（先頭に挿入）
  g.insert("rect", ":first-child")
    .attr("class", "pan-rect")
    .attr("x", 0)
    .attr("y", -margin.top)
    .attr("width", width)
    .attr("height", svgHeight)
    .style("fill", "transparent")
    .style("cursor", "grab")
    .call(d3.drag<SVGRectElement, unknown>()
      .on("start", () => {
        g.style("cursor", "grabbing")
      })
      .on("drag", (event) => {
        currentTranslateX += event.dx
        // translate を更新
        g.attr(
          "transform",
          `translate(${margin.left + currentTranslateX},${margin.top})`
        )
      })
      .on("end", () => {
        g.style("cursor", "grab")
      })
    )

  // タスクバー＋進捗バー＋イベント
  tasks
    .filter(t => t.status !== "milestone")
    .forEach((task, i) => {
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
      bar.on('mouseover', (event) => {
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
        .on('mousemove', (event) => {
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
              const dayOffset = Math.round(dx / cellWidth)
              const newStart = new Date(task.scheduledStartDate.getTime() + dayOffset * dayMs)
              if (newStart < task.scheduledEndDate) {
                task.scheduledStartDate = newStart
                const x1 = xScale(newStart)
                const w1 = xScale(task.scheduledEndDate) - x1
                bar.attr('x', x1).attr('width', w1)
                updateProgressLine(xScale)
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
              const dayCount = Math.max(1, Math.round(dx / cellWidth))
              task.scheduledEndDate = new Date(task.scheduledStartDate.getTime() + dayCount * dayMs)
              bar.attr('width', cellWidth * dayCount)
              updateProgressLine(xScale)
            })
          )
      }
    })

  // ── 進捗ライン（イナズマ線） ──
  function updateProgressLine(scale: d3.ScaleTime<number, number>) {
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

  // 初期表示時に一度呼ぶ
  updateProgressLine(xScale)
}
