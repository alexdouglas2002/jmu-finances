import * as d3 from "d3";
import * as d3Sankey from "d3-sankey";

const width = 928;
const height = 600;
const format = d3.format(",.0f");
const linkColor = "source-target";

const svg = d3.create("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height])
  .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

const sankey = d3Sankey.sankey()
  .nodeId(d => d.name)
  .nodeAlign(d3Sankey.sankeyJustify)
  .nodeWidth(15)
  .nodePadding(10)
  .extent([[1, 5], [width - 1, height - 5]]);


async function init() {
  const data = await d3.json("data/jmu.json");
  makeSan(data, "student-costs", "containerOne");
  makeSan(data, "comprehensive-fee", "containerTwo");
  makeSan(data, "revenues", "containerThree");
  makeSan(data, "athletics", "containerFour");
}

function makeSan(data, type, containerId) {
  const { nodes, links } = handle(data, type);

  const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
    nodes: nodes.map((d) => Object.assign({}, d)),
    links: links.map((d) => Object.assign({}, d)),
  });

  console.log('nodes', nodes);
  console.log('links', links);

  const svg = d3
    .select(`#${containerId}`)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const rect = svg
    .append("g")
    .attr("stroke", "#000")
    .selectAll("rect")
    .data(sankeyNodes)
    .join("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("fill", (d) => color(d.name));

  rect.append("title").text((d) => `${d.name}\nValue: ${format(d.value)}`);

  const link = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke-opacity", 0.5)
    .selectAll("g")
    .data(sankeyLinks)
    .join("g")
    .style("mix-blend-mode", "multiply");

  if (linkColor === "source-target") {
    const gradient = link
      .append("linearGradient")
      .attr("id", (d) => (d.uid = `link-${d.index}`))
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", (d) => d.source.x1)
      .attr("x2", (d) => d.target.x0);
    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", (d) => color(d.source.name));
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", (d) => color(d.target.name));
  }

  link
    .append("path")
    .attr("d", d3Sankey.sankeyLinkHorizontal())
    .attr(
      "stroke",
      linkColor === "source-target"
        ? (d) => `url(#${d.uid})`
        : linkColor === "source"
          ? (d) => color(d.source.name)
          : linkColor === "target"
            ? (d) => color(d.target.name)
            : linkColor
    )
    .attr("stroke-width", (d) => Math.max(1, d.width));

  link
    .append("title")
    .text((d) => `${d.source.name} → ${d.target.name}\nValue: ${format(d.value)}`);

  svg
    .append("g")
    .selectAll("text")
    .data(sankeyNodes)
    .join("text")
    .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
    .attr("y", (d) => (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
    .text((d) => d.name);
}

function handle(data, type) {
  const nodes = [];
  const links = [];

  const newNode = (name) => {
    if (!nodes.find((n) => n.name === name)) {
      nodes.push({ name });
    }
  };

  if (type === "student-costs") {
    newNode("JMU Student");
    ["Fall", "Spring"].forEach((semester) => newNode(semester));

    data["student-costs"]
      .filter((item) => item.type === "student itemized")
      .forEach((item) => {
        newNode(item.name);
        links.push({
          source: "JMU Student",
          target: item.semester,
          value: item["in-state"],
        });
        links.push({
          source: item.semester,
          target: item.name,
          value: item["in-state"],
        });
      });
  } else if (type === "comprehensive-fee") {
    newNode("Auxiliary Comprehensive Fee");

    data["student-costs"]
      .filter((item) => item.type === "Auxiliary Comprehensive Fee Component")
      .forEach((component) => {
        newNode(component.name);
        links.push({
          source: "Auxiliary Comprehensive Fee",
          target: component.name,
          value: component.amount,
        });
      });
  } else if (type === "revenues") {
    newNode("JMU");

    data["jmu-revenues"].forEach((revenue) => {
      newNode(revenue.type);
      newNode(revenue.name);

      links.push({
        source: "JMU",
        target: revenue.type,
        value: Math.abs(revenue["2023"]),
      });

      links.push({
        source: revenue.type,
        target: revenue.name,
        value: Math.abs(revenue["2023"]),
      });
    });
  } else if (type === "athletics") {
    const sports = ["Football", "Men's Basketball", "Women's Basketball", "Other sports", "Non-Program Specific"];
    sports.forEach((sport) => newNode(sport));
    newNode("JMU Athletics");

    data["jmu-athletics"].forEach((item) => {
      newNode(item.name);

      sports.forEach((sport) => {
        if (item[sport] > 0) {
          links.push({
            source: sport,
            target: "JMU Athletics",
            value: item[sport],
          });
          links.push({
            source: "JMU Athletics",
            target: item.name,
            value: item[sport],
          });
        }
      });
    });
  }
  return { nodes, links };
}

init();
