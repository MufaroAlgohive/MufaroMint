import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Logo ─────────────────────────────────────────────────────────────────────
const LOGO_SVG_B64 = "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMiIgZGF0YS1uYW1lPSJMYXllciAyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MjkzLjI3IDI3NTcuNzEiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICNmZmY7CiAgICAgIH0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDxnIGlkPSJMYXllcl8xLTIiIGRhdGEtbmFtZT0iTGF5ZXIgMSI+CiAgICA8Zz4KICAgICAgPGc+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMzMzMy4xOSwyODAuOGMyNi43OSwxMy4wNywxNy42OCw1My4zNS0xMi4xMyw1My42Mmgwcy01NDIuNjMsMC01NDIuNjMsMGMtMTUuNiwwLTI4LjI0LDEyLjY0LTI4LjI0LDI4LjI0djI0MS40YzAsMTUuNi0xMi42NCwyOC4yNC0yOC4yNCwyOC4yNGgtNTE0LjM2Yy0xNS42LDAtMjguMjQtMTIuNjQtMjguMjQtMjguMjR2LTI2My4yM2MwLTEwLjExLDUuNC0xOS40NSwxNC4xNy0yNC40OEwyNzM3LjIzLDMuNzZjOC4xMy00LjY3LDE4LjA0LTUuMDEsMjYuNDYtLjlsNTY5LjUsMjc3Ljk0WiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI5NjAuMDcsNDg0LjYyYy0yNi43OS0xMy4wNy0xNy42OC01My4zNSwxMi4xMy01My42MmgwczU0Mi42MywwLDU0Mi42MywwYzE1LjYsMCwyOC4yNC0xMi42NCwyOC4yNC0yOC4yNHYtMjQxLjRjMC0xNS42LDEyLjY0LTI4LjI0LDI4LjI0LTI4LjI0aDUxNC4zNmMxNS42LDAsMjguMjQsMTIuNjQsMjguMjQsMjguMjR2MjYzLjIzYzAsMTAuMTEtNS40LDE5LjQ1LTE0LjE3LDI0LjQ4bC01NDMuNzEsMzEyLjU5Yy04LjEzLDQuNjctMTguMDQsNS4wMS0yNi40Ni45bC01NjkuNS0yNzcuOTRaIi8+CiAgICAgIDwvZz4KICAgICAgPGc+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMCwyMzM3LjM2di05MjYuMjNjMC05MS4yOSwzMi4yOC0xNjkuNTgsOTYuODUtMjM0LjksNjUuMy02NC41NywxNDMuNjEtOTYuODUsMjM0LjktOTYuODVoMjQuNDljMTA0LjY1LDAsMTk0LjA3LDM3LjEzLDI2OC4yOSwxMTEuMzMsNDAuODEsNDAuODMsNzAuNSw4Ni40Nyw4OS4wNiwxMzYuOTNsMzMwLjYzLDY2Mi4zOCwzMzAuNjQtNjYyLjM4YzE4LjU0LTUwLjQ2LDQ4LjYtOTYuMSw5MC4xOC0xMzYuOTMsNzQuMjEtNzQuMiwxNjMuNjUtMTExLjMzLDI2OC4yOS0xMTEuMzNoMjMuMzhjOTIuMDIsMCwxNzAuMzMsMzIuMjgsMjM0LjksOTYuODUsNjUuMyw2NS4zMiw5Ny45NywxNDMuNjIsOTcuOTcsMjM0Ljl2OTI2LjIzaC0zNzkuNjJ2LTc4My43M2MwLTEyLjYxLTQuODQtMjMuNzQtMTQuNDctMzMuNC05LjY1LTguOS0yMC43OS0xMy4zNi0zMy40LTEzLjM2LTYuNjgsMC0xMi45OSwxLjEyLTE4LjkyLDMuMzQtNS4yMSwyLjIyLTEwLjAyLDUuNTctMTQuNDgsMTAuMDJoLTEuMTFsLTQwOC41Nyw4MTcuMTRoLTM0OC40NWwtMTkwLjM3LTM3OS42My0yMTkuMzEtNDM3LjUxYy00LjQ2LTQuNDUtOS42NS03Ljc5LTE1LjU5LTEwLjAyLTUuOTQtMi4yMi0xMS44OC0zLjM0LTE3LjgxLTMuMzQtMTMuMzYsMC0yNC44OCw0LjQ2LTM0LjUyLDEzLjM2LTguOSw5LjY2LTEzLjM2LDIwLjgtMTMuMzYsMzMuNHY3ODMuNzNIMFoiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0yMjc5Ljk2LDIzMzcuMzZ2LTEyMzQuNmgzNzkuNjJ2MTIzNC42aC0zNzkuNjJaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNDIyNy4wNiwyMzYwLjczYy0xMDQuNjYsMC0xOTQuMDktMzYuNzMtMjY4LjMxLTExMC4yMS0yLjk4LTIuMjItNS41NS00LjgyLTcuNzktNy43OWgtMS4xMmwtMTMuMzQtMTYuN2MtMi45OC0yLjk1LTUuNTctNS45Mi03LjgxLTguOWwtNDU0LjItNTQ0LjM5LTE3MS40NC0yMDUuOTVjLTIuMjQtMS40Ny00Ljg1LTIuOTYtNy44MS00LjQ1LTUuOTQtMi4yMi0xMS44OC0zLjM0LTE3LjgxLTMuMzQtMTMuMzYsMC0yNC44OCw0LjgzLTM0LjUyLDE0LjQ4LTguOSw4LjktMTMuMzYsMjAuMDMtMTMuMzYsMzMuMzl2ODMwLjVoLTM3OS42MnYtOTI2LjIzYzAtOTEuMjksMzIuMjgtMTY5LjU4LDk2Ljg1LTIzNC45LDY1LjMtNjQuNTcsMTQzLjYxLTk2Ljg1LDIzNC45LTk2Ljg1aDI0LjQ5YzEwNC42NCwwLDE5NC4wNywzNy4xMywyNjguMywxMTEuMzMsMi4yMSwyLjIyLDQuNDUsNC40NSw2LjY3LDYuNjdoMS4xbDE0LjQ4LDE2LjdjMi4yMiwyLjk4LDQuNDYsNS45NSw2LjY3LDguOTFsNjI1LjY3LDc1MC4zNGMyLjIyLDIuMjIsNC44MiwzLjcxLDcuNzksNC40NSw1Ljk0LDIuMjIsMTIuMjQsMy4zNCwxOC45MywzLjM0LDEyLjYxLDAsMjMuNzQtNC40NiwzMy40LTEzLjM2LDkuNjMtOS42NSwxNC40Ni0yMC43OCwxNC40Ni0zMy40di04MzEuNmgzNzkuNjF2OTI2LjIzYzAsOTIuMDQtMzIuNjcsMTcwLjMyLTk3Ljk2LDIzNC44OS02NC41Nyw2NC41Ny0xNDIuODgsOTYuODUtMjM0LjksOTYuODVoLTIzLjM2WiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTUyOTUuNzksMjMzNy4zNnYtOTQ5LjYxaC02MTYuNzZ2LTI4NWgxNjE0LjIzdjI4NWgtNjE3Ljg2djk0OS42MWgtMzc5LjYxWiIvPgogICAgICA8L2c+CiAgICAgIDxnPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTAsMjc1NC40NnYtMTU1LjdoMjAuNDRsNTYuNDQsMTE3LjA5LDU2LjExLTExNy4wOWgyMC42NXYxNTUuNTloLTIxLjQxdi0xMDYuNTFsLTUwLjI4LDEwNi42MWgtMTAuMjdsLTUwLjM4LTEwNi42MXYxMDYuNjFIMFoiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik01NDAuODQsMjc1Ny43MWMtMTUuNTcsMC0yOC44NC0zLjQxLTM5Ljc5LTEwLjIyLTEwLjk2LTYuODEtMTkuMzQtMTYuMy0yNS4xNC0yOC40OS01LjgtMTIuMTgtOC43LTI2LjMxLTguNy00Mi4zOHMyLjktMzAuMjEsOC43LTQyLjM4YzUuOC0xMi4xOSwxNC4xOC0yMS42OCwyNS4xNC0yOC41LDEwLjk1LTYuODEsMjQuMjItMTAuMjEsMzkuNzktMTAuMjFzMjguNzQsMy40MSwzOS43MywxMC4yMWMxMC45OSw2LjgxLDE5LjM3LDE2LjMxLDI1LjE0LDI4LjUsNS43NywxMi4xOCw4LjY1LDI2LjMxLDguNjUsNDIuMzhzLTIuODgsMzAuMjEtOC42NSw0Mi4zOGMtNS43NywxMi4xOS0xNC4xNSwyMS42OC0yNS4xNCwyOC40OS0xMC45OSw2LjgxLTI0LjI0LDEwLjIyLTM5LjczLDEwLjIyWk01NDAuODQsMjczNi4xOWMxMS4wMy4xNSwyMC4yLTIuMjksMjcuNTItNy4zLDcuMzEtNSwxMi44MS0xMiwxNi40OS0yMC45NywzLjY3LTguOTgsNS41MS0xOS40MSw1LjUxLTMxLjNzLTEuODQtMjIuMjktNS41MS0zMS4yYy0zLjY4LTguOS05LjE4LTE1Ljg0LTE2LjQ5LTIwLjgxLTcuMzItNC45OC0xNi40OS03LjUtMjcuNTItNy41Ny0xMS4wMy0uMTQtMjAuMiwyLjI3LTI3LjUyLDcuMjUtNy4zMiw0Ljk3LTEyLjgxLDExLjk2LTE2LjQ5LDIwLjk3LTMuNjcsOS4wMi01LjU1LDE5LjQ2LTUuNjIsMzEuMzYtLjA3LDExLjg5LDEuNzMsMjIuMjksNS40MSwzMS4xOSwzLjY4LDguOSw5LjIxLDE1Ljg0LDE2LjYsMjAuODIsNy4zOSw0Ljk4LDE2LjYsNy41LDI3LjYzLDcuNTdaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNOTI3LjkyLDI3NTQuNDZ2LTE1NS43aDIyLjkybDc2LjY2LDExNS42OXYtMTE1LjY5aDIyLjkydjE1NS43aC0yMi45MmwtNzYuNjYtMTE1Ljh2MTE1LjhoLTIyLjkyWiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTEzNzIuNjQsMjc1NC40NnYtMTU1LjdoOTkuNDd2MjEuM2gtNzYuODh2NDMuNjhoNjMuOXYyMS4zaC02My45djQ4LjExaDc2Ljg4djIxLjNoLTk5LjQ3WiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE4MjcuNTIsMjc1NC40NnYtNjQuMzNsLTUyLjY2LTkxLjM2aDI2LjM4bDM3LjczLDY1LjQxLDM3LjczLTY1LjQxaDI2LjM4bC01Mi42Niw5MS4zNnY2NC4zM2gtMjIuOTJaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMjUzOC44NywyNzU0LjQ2di0xNTUuN2gyMi42djE1NS43aC0yMi42WiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI4ODUuODQsMjc1NC40NnYtMTU1LjdoMjIuOTJsNzYuNjYsMTE1LjY5di0xMTUuNjloMjIuOTJ2MTU1LjdoLTIyLjkybC03Ni42Ni0xMTUuOHYxMTUuOGgtMjIuOTJaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMzcwNC41NiwyNzU0LjQ2di0xMzQuNGgtNTEuOHYtMjEuM2gxMjYuMTh2MjEuM2gtNTEuNzl2MTM0LjRoLTIyLjZaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNDA4OC4xOCwyNzU0LjQ2di0xNTUuN2g2Mi45M2MxLjUxLDAsMy4zOS4wNSw1LjYyLjE2LDIuMjMuMTEsNC4zNi4zNCw2LjM4LjcsOC42NSwxLjM3LDE1Ljg3LDQuMzMsMjEuNjgsOC44Nyw1LjgsNC41NCwxMC4xNCwxMC4yNywxMy4wMiwxNy4xOSwyLjg5LDYuOTIsNC4zMywxNC41Niw0LjMzLDIyLjkzLDAsMTIuNC0zLjE3LDIzLjA4LTkuNTIsMzIuMDYtNi4zNCw4Ljk4LTE1Ljg2LDE0LjU4LTI4LjU0LDE2LjgxbC05LjE5LDEuMDhoLTQ0LjEydjU1LjloLTIyLjZaTTQxMTAuNzgsMjY3Ny4xNmgzOS40NmMxLjQ0LDAsMy4wNS0uMDcsNC44MS0uMjIsMS43Ni0uMTUsMy40NC0uMzksNS4wMy0uNzYsNC42MS0xLjA4LDguMzMtMy4wOCwxMS4xNC02LDIuODEtMi45Miw0LjgzLTYuMjksNi4wNS0xMC4xMSwxLjIyLTMuODIsMS44NC03LjY0LDEuODQtMTEuNDZzLS42MS03LjYyLTEuODQtMTEuNDFjLTEuMjItMy43OS0zLjI1LTcuMTQtNi4wNS0xMC4wNS0yLjgxLTIuOTItNi41My00LjkyLTExLjE0LTYtMS41OS0uNDMtMy4yNy0uNzItNS4wMy0uODctMS43Ny0uMTQtMy4zNy0uMjEtNC44MS0uMjFoLTM5LjQ2djU3LjA5Wk00MTc5LjIyLDI3NTQuNDZsLTMwLjcxLTYzLjM2LDIyLjgxLTUuODQsMzMuNzQsNjkuMmgtMjUuODRaIi8+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNDUwOS45NywyNzU0LjQ2bDUwLjYxLTE1NS43aDMyLjU0bDUwLjYxLDE1NS43aC0yMy40NmwtNDYuNjEtMTQyLjA4aDUuODRsLTQ2LjA2LDE0Mi4wOGgtMjMuNDdaTTQ1MzYuMjUsMjcxOS4zMnYtMjEuMmg4MS4zMXYyMS4yaC04MS4zMVoiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik00OTU1LjEyLDI3NTQuNDZ2LTE1NS43aDIyLjkzbDc2LjY2LDExNS42OXYtMTE1LjY5aDIyLjkydjE1NS43aC0yMi45MmwtNzYuNjYtMTE1Ljh2MTE1LjhoLTIyLjkzWiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTU0NTYuMjgsMjc1Ny43MWMtMTEuMTcsMC0yMS4yNC0xLjkzLTMwLjIyLTUuNzktOC45OC0zLjg2LTE2LjM2LTkuMzctMjIuMTctMTYuNTQtNS44LTcuMTctOS41Ny0xNS43LTExLjMtMjUuNTdsMjMuNTctMy41N2MyLjM4LDkuNTIsNy4zNSwxNi45MiwxNC45MiwyMi4yMiw3LjU3LDUuMywxNi40LDcuOTUsMjYuNSw3Ljk1LDYuMjcsMCwxMi4wNC0uOTksMTcuMy0yLjk4LDUuMjctMS45OCw5LjUtNC44MiwxMi43MS04LjU0LDMuMjEtMy43MSw0LjgxLTguMTcsNC44MS0xMy4zNSwwLTIuODEtLjQ5LTUuMy0xLjQ2LTcuNDYtLjk3LTIuMTYtMi4zMS00LjA1LTQtNS42Ny0xLjctMS42My0zLjc1LTMuMDMtNi4xNy00LjIyLTIuNDEtMS4xOS01LjA2LTIuMjItNy45NS0zLjA4bC0zOS44OS0xMS43OGMtMy44OS0xLjE1LTcuODYtMi42NS0xMS45LTQuNDktNC4wNC0xLjg0LTcuNzMtNC4yNS0xMS4wOC03LjI0LTMuMzYtMi45OS02LjA3LTYuNy04LjE3LTExLjE0LTIuMDktNC40My0zLjE0LTkuODItMy4xNC0xNi4xNiwwLTkuNTksMi40Ny0xNy43Miw3LjQxLTI0LjM4LDQuOTMtNi42NywxMS42Mi0xMS43MSwyMC4wNi0xNS4xMyw4LjQzLTMuNDIsMTcuODctNS4xNCwyOC4zMy01LjE0LDEwLjUyLjE1LDE5Ljk1LDIuMDIsMjguMjgsNS42Miw4LjMzLDMuNiwxNS4yNSw4Ljc4LDIwLjc2LDE1LjUxLDUuNTEsNi43NCw5LjMxLDE0LjksMTEuNCwyNC40OWwtMjQuMjIsNC4xMWMtMS4wOC01Ljg0LTMuMzktMTAuODctNi45Mi0xNS4wOS0zLjUzLTQuMjItNy44Ni03LjQ2LTEyLjk3LTkuNzMtNS4xMi0yLjI3LTEwLjY3LTMuNDQtMTYuNjYtMy41Mi01Ljc3LS4xNC0xMS4wNC43My0xNS44NCwyLjYtNC43OSwxLjg3LTguNjIsNC41MS0xMS40Niw3Ljg5LTIuODUsMy4zOS00LjI3LDcuMjktNC4yNywxMS42OHMxLjI2LDcuODIsMy43OSwxMC40OWMyLjUyLDIuNjcsNS42NCw0Ljc4LDkuMzUsNi4zMywzLjcyLDEuNTUsNy40MSwyLjgzLDExLjA5LDMuODRsMjguNzYsOC4xMWMzLjYsMS4wMSw3LjY5LDIuMzcsMTIuMjgsNC4wNSw0LjU4LDEuNyw5LjAxLDQuMDUsMTMuMyw3LjA4LDQuMjksMy4wMyw3Ljg0LDcuMDUsMTAuNjUsMTIuMDYsMi44MSw1LjAxLDQuMjIsMTEuMyw0LjIyLDE4Ljg3cy0xLjU4LDE0Ljc2LTQuNzYsMjAuN2MtMy4xNyw1Ljk1LTcuNTEsMTAuOTMtMTMuMDMsMTQuOTItNS41MSw0LTExLjg4LDcuMDEtMTkuMDgsOS4wMy03LjIxLDIuMDEtMTQuODEsMy4wMy0yMi44MSwzLjAzWiIvPgogICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTU4MzMuMDksMjc1NC40NnYtMTU1LjdoMjIuNnYxNTUuN2gtMjIuNloiLz4KICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik02MjE4Ljg4LDI3NTQuNDZ2LTEzNC40aC01MS44di0yMS4zaDEyNi4xOHYyMS4zaC01MS43OXYxMzQuNGgtMjIuNloiLz4KICAgICAgPC9nPgogICAgPC9nPgogIDwvZz4KPC9zdmc+";
const LOGO_ASPECT  = 6293.27 / 2757.71;

let _logoCache = null;

function _renderLogoToPng(h) {
  const scale = 3;
  const pxH   = Math.round(h * scale * (96 / 25.4));
  const pxW   = Math.round(pxH * LOGO_ASPECT);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = pxW;
      canvas.height = pxH;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, pxW, pxH);
      ctx.drawImage(img, 0, 0, pxW, pxH);
      try { resolve(canvas.toDataURL("image/png")); }
      catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("SVG logo failed to load"));
    img.src = "data:image/svg+xml;base64," + LOGO_SVG_B64;
  });
}

async function drawLogo(doc, x, y, h) {
  if (h <= 0) return;
  if (!_logoCache) {
    try   { _logoCache = await _renderLogoToPng(h); }
    catch { _drawLogoFallback(doc, x, y, h); return; }
  }
  doc.addImage(_logoCache, "PNG", x, y, h * LOGO_ASPECT, h);
}

function _drawLogoFallback(doc, x, y, h) {
  const cw = h * 0.82;
  doc.setFillColor(91, 33, 182);
  doc.triangle(x, y + h * 0.5, x + cw * 0.55, y, x + cw * 0.55, y + h, "F");
  doc.setFillColor(59, 27, 122);
  doc.triangle(x + cw * 0.3, y + h * 0.5, x + cw, y, x + cw, y + h, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(h * 3.05);
  doc.setTextColor(255, 255, 255);
  doc.text("MINT", x + cw + h * 0.22, y + h * 0.78);
  doc.setFontSize(10);
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const P        = [59,  27,  122];
const P_MID    = [91,  33,  182];
const P_DIM    = [130, 95,  210];
const P_LITE   = [237, 233, 254];
const P_PALE   = [246, 244, 255];
const P_STRIPE = [228, 222, 250];
const WHITE    = [255, 255, 255];
const DARK     = [18,  21,  38 ];
const BODY     = [50,  35,  90 ];
const DIV      = [210, 200, 240];
const GREEN    = [22,  163, 74 ];
const RED      = [220, 38,  38 ];
const AMBER    = [217, 119, 6  ];

const PW = 210, PH = 297, ML = 14, MR = 14, CW = PW - ML - MR;

const tc = (doc, c) => doc.setTextColor(...c);
const fc = (doc, c) => doc.setFillColor(...c);
const dc = (doc, c) => doc.setDrawColor(...c);

function hl(doc, x1, y, x2, col = DIV, lw = 0.18) {
  dc(doc, col); doc.setLineWidth(lw); doc.line(x1, y, x2, y);
}

const LEGAL_TAGLINE =
  "MINT (Pty) Ltd · Authorised FSP 55118 · Regulated by the FSCA · Registered Credit Provider NCRCP22892 · © 2026 MINT. All rights reserved.";

const parseAmount = (str) => {
  if (!str) return 0;
  const s = String(str).trim();
  const negative = s.startsWith("-") || s.startsWith("−");
  const v = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(v) ? 0 : negative ? -v : v;
};

const fmtR = (v) => {
  if (v == null || isNaN(v)) return "—";
  const abs = Math.abs(v);
  let s;
  if (abs >= 1e9)      s = "R " + (abs / 1e9).toFixed(2) + "bn";
  else if (abs >= 1e6) s = "R " + (abs / 1e6).toFixed(2) + "m";
  else                 s = "R " + abs.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? "-" + s : s;
};

const fmtPct = (v) => {
  if (v == null || !isFinite(v)) return "—";
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
};

const getMintAccountNumber = (profile) =>
  profile?.mintNumber || profile?.accountNumber ||
  (profile?.id ? "MINT-" + String(profile.id).slice(0, 8).toUpperCase() : "MINT-XXXXXXXX");

function secHead(doc, num, label, y) {
  const H = 7.5;
  fc(doc, P); doc.rect(ML, y, CW, H, "F");
  fc(doc, P_MID); doc.rect(ML, y, 3, H, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); tc(doc, [185, 155, 230]);
  doc.text(num + ".", ML + 5.5, y + 5.1);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); tc(doc, WHITE);
  doc.text(label.toUpperCase(), ML + 14, y + 5.1);
  return y + H + 4;
}

function kpiCard(doc, label, value, x, y, w, h, valCol = DARK) {
  fc(doc, P_LITE); doc.roundedRect(x, y, w, h, 2, 2, "F");
  fc(doc, P_MID); doc.rect(x, y, w, 2, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.2); tc(doc, P_DIM);
  doc.text(label.toUpperCase(), x + 3.5, y + 7);
  let fs = 9;
  doc.setFont("helvetica", "bold"); doc.setFontSize(fs); tc(doc, valCol);
  while (doc.getTextWidth(value) > w - 7 && fs > 5.5) { fs -= 0.5; doc.setFontSize(fs); }
  doc.text(value, x + 3.5, y + 14.5);
}

async function carryHeader(doc, clientName, accountNo, pageNum, totalPages) {
  const HDR_H = 13, LOGO_H = 5;
  fc(doc, P); doc.rect(0, 0, PW, HDR_H, "F");
  fc(doc, P_MID); doc.rect(0, 0, PW, 1.8, "F");
  await drawLogo(doc, ML, (HDR_H - LOGO_H) / 2, LOGO_H);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); tc(doc, [185, 155, 230]);
  doc.text(clientName + "  ·  " + accountNo, PW / 2, 8.2, { align: "center" });
  tc(doc, [160, 130, 210]);
  doc.text("Page " + pageNum + " of " + totalPages, PW - MR, 8.2, { align: "right" });
}

async function pageFooter(doc, accountNo, isoDate, pageNum, totalPages) {
  const FY = PH - 12, LOGO_H = 4.5, LOGO_W = LOGO_H * LOGO_ASPECT;
  fc(doc, P); doc.rect(0, FY, PW, 12, "F");
  fc(doc, P_MID); doc.rect(0, FY, PW, 1.2, "F");
  await drawLogo(doc, ML, FY + 2.8, LOGO_H);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); tc(doc, [185, 160, 225]);
  doc.text("Investment Statement  ·  " + accountNo, ML + LOGO_W + 4, FY + 5.8);
  doc.setFont("helvetica", "normal"); doc.setFontSize(4.5); tc(doc, [160, 130, 205]);
  doc.text(LEGAL_TAGLINE, ML, FY + 9.5, { maxWidth: PW - ML - MR - 30 });
  tc(doc, [160, 140, 200]);
  doc.text("Page " + pageNum + " of " + totalPages, PW - MR, FY + 5, { align: "right" });
  doc.text("Generated " + isoDate, PW - MR, FY + 9.5, { align: "right" });
}

function onNewPage(doc, clientName, accountNo) {
  return (data) => {
    if (data.pageNumber > 1) carryHeader(doc, clientName, accountNo, doc.internal.getNumberOfPages(), "?");
  };
}

const DISC_SECTIONS = [
  { title: "Investment Strategy Provider",
    body: "Mint Platforms (Pty) Ltd (Reg. 2024/644796/07) trading as MINT, 3 Gwen Lane, Sandown, Sandton, provides investment strategy design and portfolio management services through managed investment strategies. Strategies on the MINT platform are not collective investment schemes or pooled funds unless explicitly stated. This document does not constitute financial advice as defined under FAIS Act No. 37 of 2002 and is provided for informational purposes only. Investors should seek independent financial advice prior to investing." },
  { title: "Custody & Asset Safekeeping",
    body: "Client assets are held in custody through Computershare Investor Services (Pty) Ltd (CSDP), via its nominee Computershare Nominees (Pty) Ltd (Reg. 1999/008543/07), Rosebank Towers, 15 Biermann Avenue, Rosebank, Johannesburg. Client assets remain fully segregated from MINT\'s own operating assets at all times." },
  { title: "Nature of Investment Strategies",
    body: "Investment strategies are actively managed portfolios where Mint may rebalance, adjust or change portfolio allocations in accordance with the stated strategy mandate. Rebalancing may occur at any time in response to strategic reallocation, tactical positioning, risk management adjustments, or optimisation of portfolio exposures." },
  { title: "Performance Disclosure",
    body: "Performance information may include historical realised performance and back-tested or simulated results. Back-tested performance is hypothetical, constructed with hindsight, and does not represent actual trading results. Past performance, whether actual or simulated, is not a reliable indicator of future performance. Performance shown is gross of fees unless stated. Individual investor returns may differ based on timing, deposits, withdrawals, costs, and applicable taxes." },
  { title: "Fees & Charges",
    body: "Performance fee: 20% of investment profits. No management or AUM-based fee is charged. Transaction fee: 0.25% per trade executed within the portfolio. Custody and administrative fees are charged per ISIN and displayed transparently at checkout prior to investment confirmation. A full schedule of fees is available on request from Mint." },
  { title: "Investment Risk Disclosure",
    body: "The value of investments may increase or decrease and investors may lose part or all of their invested capital. Strategies are subject to: Market Risk, Equity Risk, Volatility Risk, Derivative Risk, Leverage Risk, Liquidity Risk, Counterparty Risk, Concentration Risk, Correlation Risk, Foreign Market Risk, Strategy Risk, Rebalancing Risk, and Model & Back-Test Risk." },
  { title: "Market & Equity Risk",
    body: "Investment strategies are exposed to general market movements. Share prices may fluctuate due to company-specific factors, earnings performance, competitive pressures, or broader macroeconomic and sector conditions. Equity investments may experience periods of significant volatility." },
  { title: "Liquidity & Concentration Risk",
    body: "Liquidity risk arises when securities cannot be bought or sold quickly enough to prevent or minimise losses. Concentration risk arises from holding large positions in specific securities, sectors, or regions, increasing sensitivity to adverse events affecting those positions." },
  { title: "Leverage & Counterparty Risk",
    body: "Where leverage is employed, adverse market movements may result in amplified losses. Counterparty risk refers to the risk that a financial institution or trading counterparty may fail to fulfil its contractual obligations in relation to derivative contracts, settlement arrangements, or other financial transactions." },
  { title: "Model, Back-Test & Strategy Risk",
    body: "Strategies relying on quantitative models or back-tested simulations present inherent limitations. Actual investment outcomes may differ materially from simulated results. There is no assurance that a strategy will achieve its intended objective. Rebalancing may result in transaction costs and may not always produce favourable outcomes." },
  { title: "Liquidity & Withdrawal Considerations",
    body: "Investments are subject to market liquidity. Where large withdrawals occur or where underlying market liquidity is constrained, withdrawal requests may be processed over time to ensure orderly portfolio management and investor protection." },
  { title: "Conflicts of Interest",
    body: "Mint is committed to fair treatment of all investors. No investor will receive preferential fee or liquidity terms within the same investment strategy unless explicitly disclosed. Where commissions or incentives are payable to third parties, such arrangements will be disclosed in accordance with applicable regulatory requirements." },
];

async function addDisclosurePage(doc, clientName, accountNo, isoDate) {
  doc.addPage();

  const HDR_H = 32, LOGO_H = 8, LOGO_W = LOGO_H * LOGO_ASPECT;
  fc(doc, P); doc.rect(0, 0, PW, HDR_H, "F");
  fc(doc, P_MID); doc.rect(0, 0, PW, 1.8, "F");
  fc(doc, P_MID); doc.rect(0, HDR_H, PW, 0.7, "F");

  await drawLogo(doc, PW - MR - LOGO_W, (HDR_H - LOGO_H) / 2, LOGO_H);

  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); tc(doc, WHITE);
  doc.text("INVESTMENT STATEMENT", ML, 11);
  hl(doc, ML, 14, ML + 80, [120, 90, 180], 0.25);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); tc(doc, WHITE);
  doc.text("Important Disclosures, Risk Factors & Legal Notice", ML, 19);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5); tc(doc, [160, 130, 210]);
  doc.text(clientName.toUpperCase() + "  ·  " + accountNo, ML, 24);
  doc.setFont("helvetica", "normal"); doc.setFontSize(4.5); tc(doc, [185, 155, 230]);
  doc.text(LEGAL_TAGLINE, ML, 28.5, { maxWidth: PW - MR - LOGO_W - ML - 4 });

  fc(doc, [252, 250, 255]);
  doc.rect(0, HDR_H + 0.7, PW, PH - HDR_H - 0.7, "F");

  const COL_W = (CW - 6) / 2, COL2_X = ML + COL_W + 6;
  const LINE_H = 2.9, SEC_GAP = 5.5, PILL_H = 6.5, startY = HDR_H + 10;

  const leftSections  = DISC_SECTIONS.filter((_, i) => i % 2 === 0);
  const rightSections = DISC_SECTIONS.filter((_, i) => i % 2 === 1);

  function renderCol(secs, colX, colW) {
    let y = startY;
    secs.forEach(sec => {
      fc(doc, P); doc.roundedRect(colX, y, colW, PILL_H, 1, 1, "F");
      fc(doc, WHITE); doc.rect(colX + 3, y + 2.3, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.2); tc(doc, WHITE);
      doc.text(sec.title.toUpperCase(), colX + 6.5, y + 4.2);
      y += PILL_H + 3;
      doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); tc(doc, BODY);
      const lines = doc.splitTextToSize(sec.body, colW - 2);
      doc.text(lines, colX + 1, y);
      y += lines.length * LINE_H + SEC_GAP;
    });
    return y;
  }

  const leftEnd  = renderCol(leftSections,  ML,     COL_W);
  const rightEnd = renderCol(rightSections, COL2_X, COL_W);
  const disclaimerY = Math.max(leftEnd, rightEnd) + 5;

  const disclaimerText =
    "This document is confidential and issued for the information of addressees and clients of Mint Platforms (Pty) Ltd only. Subject to copyright; may not be reproduced without prior written permission. Information and opinions are provided for informational purposes only and are not statements of fact. No representation or warranty is made that any strategy will achieve its objectives or generate profits. All investments carry risk; investors may lose part or all of invested capital. This document may include simulated or back-tested results which are hypothetical, constructed with hindsight, and do not represent actual trading. Performance is gross of fees unless stated. Strategies referenced are not collective investment schemes unless explicitly stated. This document does not constitute financial advice, an offer to sell, or a solicitation under FAIS Act No. 37 of 2002. The Manager accepts no liability for direct, indirect or consequential loss arising from use of, or reliance on, this document.";

  doc.setFontSize(5.2);
  const disclaimerLines = doc.splitTextToSize(disclaimerText, CW - 6);
  const disclaimerH = disclaimerLines.length * 2.4 + 13;

  fc(doc, [240, 236, 255]); doc.roundedRect(ML, disclaimerY, CW, disclaimerH, 2, 2, "F");
  dc(doc, P_MID); doc.setLineWidth(0.5); doc.roundedRect(ML, disclaimerY, CW, disclaimerH, 2, 2, "S");
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); tc(doc, P);
  doc.text("DISCLAIMER & LEGAL NOTICE", ML + 3, disclaimerY + 5.5);
  hl(doc, ML + 3, disclaimerY + 7.5, PW - MR - 3, DIV, 0.2);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.2); tc(doc, BODY);
  doc.text(disclaimerLines, ML + 3, disclaimerY + 11);

  const addInfoY = disclaimerY + disclaimerH + 5;
  if (addInfoY + 20 < PH - 16) {
    fc(doc, P_LITE); doc.roundedRect(ML, addInfoY, CW, 20, 2, 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); tc(doc, P);
    doc.text("ADDITIONAL INFORMATION & CONTACT", ML + 3, addInfoY + 5.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); tc(doc, BODY);
    const addLines = doc.splitTextToSize(
      "Additional information regarding Mint\'s investment strategies — including strategy descriptions, risk disclosures, fee schedules, investment methodology, and portfolio construction framework — is available on request.\ninfo@mymint.co.za  ·  +27 10 276 0531  ·  www.mymint.co.za  ·  3 Gwen Lane, Sandown, Sandton, Johannesburg.",
      CW - 6
    );
    doc.text(addLines, ML + 3, addInfoY + 10);
  }
}

export const generateMintStatement = async (
  profile, displayName,
  holdingsRows = [], strategyRows = [], activityItems = [],
  dateFrom = null, dateTo = null
) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const clientName = displayName || profile?.firstName || "Client";
  const accountNo  = getMintAccountNumber(profile);
  const now        = new Date();
  const isoDate    = now.toISOString().split("T")[0];
  const genStr     = now.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const fromStr    = dateFrom ? new Date(dateFrom).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const toStr      = dateTo   ? new Date(dateTo).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
                              : now.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

  const holdingsForPdf = holdingsRows.filter(r => r.type === "Holdings");
  const strategyForPdf = strategyRows;
  const txForPdf       = activityItems;
  const totalValue     = holdingsForPdf.reduce((s, r) => s + parseAmount(r.marketValue),  0);
  const totalPL        = holdingsForPdf.reduce((s, r) => s + parseAmount(r.unrealizedPL), 0);

  // Pre-warm logo cache before drawing begins
  try { _logoCache = await _renderLogoToPng(9); } catch {}

  // PAGE 1 HEADER
  const HDR_H = 46, HDR_LOGO_H = 9, HDR_LOGO_W = HDR_LOGO_H * LOGO_ASPECT;
  fc(doc, P); doc.rect(0, 0, PW, HDR_H, "F");
  fc(doc, P_MID); doc.rect(0, 0, PW, 2, "F");
  fc(doc, P_MID); doc.rect(0, HDR_H, PW, 0.8, "F");
  await drawLogo(doc, PW - MR - HDR_LOGO_W, (HDR_H / 2 - HDR_LOGO_H) / 2 + 3, HDR_LOGO_H);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); tc(doc, WHITE);
  doc.text("INVESTMENT STATEMENT", ML, 14);
  hl(doc, ML, 17, ML + 95, [130, 100, 200], 0.3);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6); tc(doc, [185, 160, 230]);
  doc.text("Period: " + fromStr + "  –  " + toStr + "  ·  Generated: " + genStr, ML, 22);
  doc.text("Currency: ZAR  ·  Platform: MINT", ML, 26.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(4.8); tc(doc, [170, 145, 215]);
  doc.text(LEGAL_TAGLINE, ML, 32, { maxWidth: PW - MR - HDR_LOGO_W - ML - 6 });
  hl(doc, ML, 36, PW - MR, [100, 75, 165], 0.2);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); tc(doc, WHITE);
  doc.text(clientName, ML, 41.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6); tc(doc, [185, 160, 230]);
  doc.text(accountNo, PW - MR, 41.5, { align: "right" });

  // CLIENT INFO CARD
  let y = HDR_H + 7;
  const CARD_H = 30;
  fc(doc, P_PALE); doc.roundedRect(ML, y, CW, CARD_H, 2, 2, "F");
  dc(doc, DIV); doc.setLineWidth(0.22); doc.roundedRect(ML, y, CW, CARD_H, 2, 2, "S");
  const HALF = (CW - 4) / 2, INFO_C2 = ML + HALF + 4;
  fc(doc, P); doc.rect(ML + 2, y + 2, HALF - 2, 6, "F");
  fc(doc, P); doc.rect(INFO_C2, y + 2, HALF - 2, 6, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(6); tc(doc, WHITE);
  doc.text("CLIENT DETAILS", ML + 4, y + 6.3);
  doc.text("STATEMENT INFO", INFO_C2 + 2, y + 6.3);
  dc(doc, DIV); doc.setLineWidth(0.2);
  doc.line(ML + HALF + 2, y + 3, ML + HALF + 2, y + CARD_H - 3);

  const truncate = (s, n) => { s = String(s || "—"); return s.length > n ? s.slice(0, n) + "…" : s; };
  const ROW_H = 4.2;
  [["Name", clientName], ["Client ID", profile?.idNumber || "—"], ["Account", accountNo], ["Email", profile?.email || "—"]].forEach((pair, i) => {
    const fy = y + 12 + i * ROW_H;
    doc.setFont("helvetica", "normal"); doc.setFontSize(6); tc(doc, P_DIM);
    doc.text(pair[0] + ":", ML + 4, fy);
    doc.setFont("helvetica", "bold"); tc(doc, DARK);
    doc.text(truncate(pair[1], 34), ML + 22, fy);
  });
  [["Period", fromStr + " – " + toStr], ["Generated", genStr], ["Currency", "ZAR"], ["Platform", "MINT"]].forEach((pair, i) => {
    const fy = y + 12 + i * ROW_H;
    doc.setFont("helvetica", "normal"); doc.setFontSize(6); tc(doc, P_DIM);
    doc.text(pair[0] + ":", INFO_C2 + 2, fy);
    doc.setFont("helvetica", "bold"); tc(doc, DARK);
    doc.text(truncate(pair[1], 34), INFO_C2 + 22, fy);
  });
  y += CARD_H + 7;

  // SECTION 1: PORTFOLIO SUMMARY
  y = secHead(doc, "1", "Portfolio Summary", y);
  const KPI_COUNT = 5, KPI_GAP = 3, KPI_W = (CW - KPI_GAP * (KPI_COUNT - 1)) / KPI_COUNT, KPI_H = 18;
  [
    { label: "Total Market Value",    value: fmtR(totalValue),             col: DARK },
    { label: "Total Unrealised P/L",  value: fmtR(totalPL),                col: totalPL >= 0 ? GREEN : RED },
    { label: "Holdings",              value: String(holdingsForPdf.length), col: DARK },
    { label: "Active Strategies",     value: String(strategyForPdf.length), col: DARK },
    { label: "Transactions (Period)", value: String(txForPdf.length),       col: DARK },
  ].forEach((k, i) => kpiCard(doc, k.label, k.value, ML + i * (KPI_W + KPI_GAP), y, KPI_W, KPI_H, k.col));
  y += KPI_H + 7;

  // SECTION 2: STRATEGY ALLOCATION
  y = secHead(doc, "2", "Strategy Allocation & Performance", y);
  if (!strategyForPdf.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); tc(doc, P_DIM);
    doc.text("No strategies subscribed.", ML + 4, y + 5); y += 14;
  } else {
    autoTable(doc, {
      startY: y, margin: { left: ML, right: MR }, tableWidth: CW,
      head: [["Strategy", "Risk Level", "Current Value", "Day Chg", "1W", "1M", "3M", "YTD"]],
      body: strategyForPdf.map(s => [s.fullName || s.title || "—", s.riskLevel || "—", s.amount || "—", fmtPct(s.changePct), fmtPct(s.r1w), fmtPct(s.r1m), fmtPct(s.r3m), fmtPct(s.rytd)]),
      styles: { fontSize: 6.5, cellPadding: 2.2, textColor: DARK, lineColor: DIV, lineWidth: 0.15 },
      headStyles: { fillColor: P, textColor: WHITE, fontStyle: "bold", fontSize: 6.2, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: P_PALE },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 44 }, 1: { cellWidth: 20 }, 2: { halign: "right", cellWidth: 26 }, 3: { halign: "right", cellWidth: 18 }, 4: { halign: "right", cellWidth: 14 }, 5: { halign: "right", cellWidth: 14 }, 6: { halign: "right", cellWidth: 14 }, 7: { halign: "right" } },
      didParseCell: d => { if (d.section === "body" && d.column.index >= 3) { const v = parseFloat((d.cell.text[0] || "").trim()); if (!isNaN(v)) { d.cell.styles.textColor = v >= 0 ? GREEN : RED; d.cell.styles.fontStyle = "bold"; } } },
      didDrawPage: onNewPage(doc, clientName, accountNo),
    });
    y = doc.lastAutoTable.finalY + 7;
  }

  // SECTION 3: HOLDINGS DETAIL
  y = secHead(doc, "3", "Holdings Detail", y);
  if (!holdingsForPdf.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); tc(doc, P_DIM);
    doc.text("No holdings found.", ML + 4, y + 5); y += 14;
  } else {
    autoTable(doc, {
      startY: y, margin: { left: ML, right: MR }, tableWidth: CW,
      head: [["Ticker", "Instrument", "Qty", "Avg Cost", "Mkt Price", "Mkt Value", "Unreal. P/L"]],
      body: holdingsForPdf.map(r => [r.ticker || "—", r.instrument || r.title || "—", r.quantity || "—", r.avgCost || "—", r.marketPrice || "—", r.marketValue || "—", r.unrealizedPL || "—"]),
      styles: { fontSize: 6.5, cellPadding: 2.2, textColor: DARK, lineColor: DIV, lineWidth: 0.15 },
      headStyles: { fillColor: P, textColor: WHITE, fontStyle: "bold", fontSize: 6.2, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: P_PALE },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 16 }, 1: { cellWidth: 46 }, 2: { halign: "right", cellWidth: 16 }, 3: { halign: "right", cellWidth: 24 }, 4: { halign: "right", cellWidth: 24 }, 5: { halign: "right", fontStyle: "bold", cellWidth: 26 }, 6: { halign: "right", fontStyle: "bold" } },
      didParseCell: d => { if (d.section === "body" && d.column.index === 6) { const raw = (d.cell.text[0] || "").trim(); if (raw !== "—") { const neg = raw.startsWith("-") || raw.startsWith("−"); d.cell.styles.textColor = neg ? RED : parseAmount(raw) !== 0 ? GREEN : DARK; d.cell.styles.fontStyle = "bold"; } } },
      didDrawPage: onNewPage(doc, clientName, accountNo),
    });
    const totalsY = doc.lastAutoTable.finalY, TOT_H = 7;
    fc(doc, P_STRIPE); doc.rect(ML, totalsY, CW, TOT_H, "F");
    dc(doc, P_MID); doc.setLineWidth(0.35);
    doc.line(ML, totalsY, ML + CW, totalsY); doc.line(ML, totalsY + TOT_H, ML + CW, totalsY + TOT_H);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); tc(doc, P);
    doc.text("PORTFOLIO TOTAL", ML + 4, totalsY + 4.8);
    tc(doc, DARK); doc.text(fmtR(totalValue), ML + 152, totalsY + 4.8, { align: "right" });
    tc(doc, totalPL >= 0 ? GREEN : RED);
    doc.text((totalPL >= 0 ? "+" : "-") + fmtR(Math.abs(totalPL)), ML + CW - 2, totalsY + 4.8, { align: "right" });
    y = totalsY + TOT_H + 7;
  }

  // SECTION 4: TRANSACTION HISTORY
  y = secHead(doc, "4", "Transaction History", y);
  if (!txForPdf.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); tc(doc, P_DIM);
    doc.text("No transactions in period.", ML + 4, y + 5); y += 14;
  } else {
    autoTable(doc, {
      startY: y, margin: { left: ML, right: MR }, tableWidth: CW,
      head: [["Date", "Description", "Category", "Type", "Status", "Amount"]],
      body: txForPdf.map(t => {
        let status = "—";
        if (t.status) { if (["successful","completed","posted"].includes(t.status)) status = "Completed"; else if (t.status === "pending") status = "Pending"; else if (t.status === "failed") status = "Failed"; else status = t.status.charAt(0).toUpperCase() + t.status.slice(1); }
        return [t.displayDate || t.date || "—", t.title || t.description || "—", t.filterCategory || "—", t.direction === "credit" ? "IN" : "OUT", status, t.amount || "—"];
      }),
      styles: { fontSize: 6.5, cellPadding: 2.2, textColor: DARK, lineColor: DIV, lineWidth: 0.15 },
      headStyles: { fillColor: P, textColor: WHITE, fontStyle: "bold", fontSize: 6.2, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: P_PALE },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 52 }, 2: { cellWidth: 26 }, 3: { cellWidth: 14, halign: "center", fontStyle: "bold" }, 4: { cellWidth: 22, halign: "center" }, 5: { halign: "right", fontStyle: "bold" } },
      didParseCell: d => {
        if (d.section !== "body") return;
        if (d.column.index === 3) { d.cell.styles.textColor = d.cell.text[0] === "IN" ? GREEN : RED; d.cell.styles.fontStyle = "bold"; }
        if (d.column.index === 4) { const s = d.cell.text[0]; d.cell.styles.textColor = s === "Completed" ? GREEN : s === "Pending" ? AMBER : s === "Failed" ? RED : DARK; }
      },
      didDrawPage: onNewPage(doc, clientName, accountNo),
    });
    y = doc.lastAutoTable.finalY + 7;
  }

  // SECTION 5: DISCLOSURES (factsheet-style two-column)
  await addDisclosurePage(doc, clientName, accountNo, isoDate);

  // STAMP FOOTERS + CARRY HEADERS
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    await pageFooter(doc, accountNo, isoDate, p, totalPages);
    if (p > 1) await carryHeader(doc, clientName, accountNo, p, totalPages);
  }

  // OUTPUT
  const safeName = clientName.replace(/[^a-zA-Z0-9]/g, "_");
  const safeAcct = accountNo.replace(/[^A-Z0-9\-]/gi, "");
  const timeStr  = now.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }).replace(/:/g, "");
  const filename = `MINT_Statement_${safeName}_${safeAcct}_${isoDate}_${timeStr}.pdf`;

  const blob = doc.output("blob");
  const url  = URL.createObjectURL(blob);
  const newTab = window.open(url, "_blank");
  if (!newTab || newTab.closed) { const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
