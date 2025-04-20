import React, { FC, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Schedule, Task } from "./types";

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

  const minDate = d3.min(tasks, d => d.scheduledStartDate)!
  const maxDate = d3.max(tasks, d => d.scheduledEndDate)!
  const totalDays = (maxDate.getTime() - minDate.getTime()) / dayMs
  const cellWidth = width / totalDays

  d3.select(svgRef.current).selectAll("*").remove()
  const svg = d3.select(svgRef.current).attr("height", svgHeight)
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  const xScale = d3
    .scaleTime()
    .domain([minDate, maxDate])
    .range([0, width])

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

  // ── 月ヘッダー ──
  const months = d3.timeMonths(d3.timeMonth.floor(minDate), d3.timeMonth.offset(maxDate, 1))
  months.forEach(m => {
    const x = xScale(m)
    const xNext = xScale(d3.timeMonth.offset(m, 1))
    g.append("rect")
      .attr("x", x)
      .attr("y", -margin.top)
      .attr("width", xNext - x)
      .attr("height", 20)
      .attr("fill", "#bbb")

    g.append("text")
      .attr("x", x + 5)
      .attr("y", -margin.top + 15)
      .text(d3.timeFormat("%Y年%-m月")(m))
      .attr("fill", "#000")
      .attr("font-size", "12px")
  })

  // ── 日ヘッダー＋グリッド線 ──
  const days = d3.timeDays(d3.timeDay.floor(minDate), d3.timeDay.offset(maxDate, 1))
  days.forEach(d => {
    const x = xScale(d)
    g.append("rect")
      .attr("x", x)
      .attr("y", -margin.top + 20)
      .attr("width", cellWidth)
      .attr("height", 20)
      .attr("fill", "#ddd")

    g.append("text")
      .attr("x", x + 2)
      .attr("y", -margin.top + 35)
      .text(d3.timeFormat("%-d")(d))
      .attr("font-size", "10px")

    // 補助線
    g.append("line")
      .attr("x1", x)
      .attr("y1", 0)
      .attr("x2", x)
      .attr("y2", tasks.length * rowHeight)
      .attr("stroke", "#aaa")
      .attr("stroke-width", 0.5)
  })

  // タスクバー＋進捗バー＋イベント
  tasks.forEach((task, i) => {
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
      .attr('x', x0)
      .attr('y', 5)
      .attr('width', w0)
      .attr('height', rowHeight - 10)
      .attr('fill', 'steelblue')
      .style('cursor', editable ? 'pointer' : 'default')

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
              updateProgressLine()
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
            updateProgressLine()
          })
        )
    }
  })

  // ── 進捗ライン（イナズマ線） ──
  function updateProgressLine() {
    g.selectAll("polyline").remove()
    const pts = tasks.map((t, i) => {
      const progX = xScale(new Date(
        t.scheduledStartDate.getTime() +
        (t.scheduledEndDate.getTime() - t.scheduledStartDate.getTime()) * (t.progress / 100)
      ))
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
  updateProgressLine()
}
