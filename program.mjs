import { chart } from "ggaction";

export const rows = Object.freeze([
  { horsepower: 52, mpg: 44, origin: "Japan" },
  { horsepower: 65, mpg: 36, origin: "Europe" },
  { horsepower: 88, mpg: 27, origin: "USA" },
  { horsepower: 110, mpg: 24, origin: "Europe" },
  { horsepower: 150, mpg: 18, origin: "USA" },
  { horsepower: 180, mpg: 15, origin: "USA" }
].map(Object.freeze));

export const baseProgram = chart()
  .createCanvas({
    width: 720,
    height: 440,
    margin: { top: 72, right: 130, bottom: 60, left: 70 },
    background: "#ffffff"
  })
  .createData({ id: "cars", values: rows })
  .createScatterPlot({
    id: "cars-points",
    x: "horsepower",
    y: "mpg",
    color: "origin",
    shape: "origin",
    guides: {
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per gallon" } }
      },
      legend: {
        channels: ["color", "shape"],
        title: "Origin"
      }
    }
  })
  .createTitle({ text: "Power and fuel economy" });

export const revisedProgram = baseProgram.editPointMark({
  target: "cars-points",
  opacity: 0.45
});
