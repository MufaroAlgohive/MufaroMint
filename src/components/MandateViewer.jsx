import React, { useState, useRef, useEffect, useCallback } from "react";

const TAB_LABELS = [
  "Discretionary FSP Mandate",
  "Introduction & Terms",
  "Schedules & Annexures",
];

const InitialsBox = ({ value, onChange, isFirst, showError }) => (
  <div style={{
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "20px",
    paddingTop: "10px",
  }}>
    <div style={{
      border: showError && !value.trim() ? "1.5px solid #ef4444" : "1px solid #333",
      padding: "5px 8px",
      width: "120px",
      background: "white",
      borderRadius: "4px",
      transition: "border-color 0.2s ease",
    }}>
      <label style={{ fontSize: "9px", fontWeight: "bold", display: "block", marginBottom: "3px" }}>Initials:</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder={isFirst ? "Type here" : ""}
        maxLength={5}
        style={{
          width: "100%",
          border: "none",
          borderBottom: "1px solid #333",
          padding: "2px 0",
          fontSize: "11px",
          outline: "none",
          background: "transparent",
          textTransform: "uppercase",
          letterSpacing: "2px",
        }}
      />
      {isFirst && !value && (
        <span style={{ fontSize: "8px", color: showError ? "#ef4444" : "#888", display: "block", marginTop: "2px" }}>
          {showError ? "Initials required" : "Enter once, fills all pages"}
        </span>
      )}
    </div>
  </div>
);

const CHECKBOX_GROUPS = {
  full_jurisdiction: ["full-local", "full-offshore", "full-both"],
  full_long_term: ["full-lt-0", "full-lt-1"],
  full_medium_term: ["full-mt-0", "full-mt-1"],
  full_short_term: ["full-st-0", "full-st-1"],
  full_risk: ["full-rp-0", "full-rp-1", "full-rp-2", "full-rp-3", "full-rp-4"],
  lim_exercise: ["lim-instruction", "lim-advice", "lim-advisor"],
  lim_jurisdiction: ["lim-local", "lim-offshore", "lim-both"],
  lim_cash: ["lim-reinvest", "lim-payout"],
  lim_long_term: ["lim-lt-0", "lim-lt-1"],
  lim_medium_term: ["lim-mt-0", "lim-mt-1"],
  lim_short_term: ["lim-st-0", "lim-st-1"],
  lim_risk: ["lim-rp-0", "lim-rp-1", "lim-rp-2", "lim-rp-3", "lim-rp-4"],
};

const MandateViewer = ({ profile = {}, onValidChange }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [initials, setInitials] = useState("");
  const scrollRef = useRef(null);
  const [checkedBoxes, setCheckedBoxes] = useState({});
  const [showErrors, setShowErrors] = useState(false);

  const toggleCheckbox = (id) => {
    setCheckedBoxes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isGroupValid = useCallback((groupKey) => {
    const ids = CHECKBOX_GROUPS[groupKey];
    return ids.some((id) => checkedBoxes[id]);
  }, [checkedBoxes]);

  const allGroupsValid = useCallback(() => {
    return Object.keys(CHECKBOX_GROUPS).every((key) => isGroupValid(key));
  }, [isGroupValid]);

  const isMandateValid = initials.trim().length > 0 && allGroupsValid();

  useEffect(() => {
    if (onValidChange) onValidChange(isMandateValid);
  }, [isMandateValid, onValidChange]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    if (activeTab === 2) {
      setShowErrors(true);
    }
  }, [activeTab]);

  const {
    firstName = "",
    lastName = "",
    idNumber = "",
    address = "",
    phoneNumber = "",
    email = "",
  } = profile;

  const extractCountryCode = (phone) => {
    if (!phone) return { countryCode: "", cellCode: "", number: "" };
    const cleaned = phone.replace(/[\s()-]/g, "");
    if (cleaned.startsWith("+27")) {
      const rest = cleaned.slice(3);
      const cellCode = rest.slice(0, 2);
      const number = rest.slice(2);
      return { countryCode: "+27", cellCode, number };
    }
    if (cleaned.startsWith("0")) {
      const cellCode = cleaned.slice(1, 3);
      const number = cleaned.slice(3);
      return { countryCode: "+27", cellCode, number };
    }
    return { countryCode: "", cellCode: "", number: cleaned };
  };

  const phoneDetails = extractCountryCode(phoneNumber);

  const extractPostalCode = (addr) => {
    if (!addr) return { address: "", code: "" };
    const match = addr.match(/(\d{4,5})\s*$/);
    if (match) {
      return { address: addr.slice(0, match.index).trim().replace(/,\s*$/, ""), code: match[1] };
    }
    return { address: addr, code: "" };
  };

  const addressDetails = extractPostalCode(address);

  const pageStyle = {
    background: "white",
    padding: "24px",
    fontSize: "11px",
    lineHeight: "1.6",
    fontFamily: "Arial, sans-serif",
    color: "#222",
  };

  const h2Style = {
    fontSize: "16px",
    fontWeight: "bold",
    margin: "20px 0 10px",
    textAlign: "center",
  };

  const h3Style = {
    fontSize: "14px",
    fontWeight: "bold",
    margin: "15px 0 10px",
  };

  const sectionNumStyle = {
    fontWeight: "bold",
  };

  const indentStyle = {
    marginLeft: "30px",
    marginBottom: "8px",
  };

  const pStyle = {
    marginBottom: "8px",
  };

  const infoTableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    margin: "15px 0",
    fontSize: "11px",
  };

  const infoTdStyle = {
    padding: "8px",
    border: "none",
    verticalAlign: "top",
  };

  const infoTdFirstStyle = {
    ...infoTdStyle,
    fontWeight: "bold",
    width: "35%",
  };

  const inputStyle = {
    width: "100%",
    border: "none",
    borderBottom: "1px solid #333",
    padding: "2px 0",
    fontSize: "11px",
    background: "transparent",
    color: "#333",
    outline: "none",
  };

  const smallInputStyle = {
    ...inputStyle,
    width: "50px",
  };

  const categoryTableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    margin: "15px 0",
    fontSize: "11px",
    border: "1px solid #333",
  };

  const catThStyle = {
    border: "1px solid #333",
    padding: "6px",
    textAlign: "left",
    background: "#f0f0f0",
    fontWeight: "bold",
  };

  const catTdStyle = {
    border: "1px solid #333",
    padding: "6px",
    textAlign: "left",
  };

  const warningBoxStyle = {
    border: "2px solid #333",
    padding: "10px",
    margin: "15px 0",
    fontSize: "11px",
    fontWeight: "bold",
  };

  const groupErrorStyle = (groupKey) => ({
    border: showErrors && !isGroupValid(groupKey) ? "1.5px solid #ef4444" : "1.5px solid transparent",
    borderRadius: "6px",
    padding: "4px 6px",
    marginBottom: "2px",
    transition: "border-color 0.2s ease",
  });

  const renderControlledCheckbox = (id, label, extra) => (
    <div key={id} style={checkboxContainerStyle}>
      <input
        type="checkbox"
        id={id}
        checked={!!checkedBoxes[id]}
        onChange={() => toggleCheckbox(id)}
        style={checkboxInputStyle}
      />
      <label htmlFor={id} style={checkboxLabelStyle}>{label}{extra}</label>
    </div>
  );

  const checkboxContainerStyle = {
    display: "flex",
    alignItems: "center",
    margin: "8px 0",
    padding: "5px 0",
  };

  const checkboxInputStyle = {
    width: "16px",
    height: "16px",
    marginRight: "10px",
    cursor: "pointer",
  };

  const checkboxLabelStyle = {
    cursor: "pointer",
    fontSize: "11px",
  };

  const renderCoverPage = () => (
    <div style={pageStyle}>
      <div style={{ textAlign: "center", paddingTop: "60px" }}>
        <h1 style={{ fontSize: "24px", marginBottom: "20px", fontWeight: "bold" }}>
          DISCRETIONARY FSP MANDATE<br />(Mandate)
        </h1>
        <p style={{ margin: "10px 0", fontSize: "12px" }}>Prepared by ALGOHIVE (PTY) LTD,</p>
        <p style={{ margin: "10px 0", fontSize: "12px" }}>in terms of the Financial Advisory and Intermediary Services Act No. 37 of 2002 (FAIS)</p>
        <p style={{ margin: "10px 0", fontSize: "12px" }}>and subsection 5.1 of the Code of Conduct for Discretionary FSPs</p>
        <p style={{ margin: "30px 0 10px", fontSize: "12px" }}>An Authorised Financial Services Provider</p>
        <p style={{ fontSize: "12px" }}><strong>FSP NO 55118</strong></p>
      </div>

      <hr style={{ margin: "40px 0", border: "none", borderTop: "1px solid #ddd" }} />

      <h2 style={h2Style}>DISCRETIONARY INVESTMENT MANAGEMENT MANDATE</h2>
      <h3 style={{ ...h3Style, textAlign: "center" }}>ENTERED INTO BETWEEN</h3>

      <h3 style={{ ...h3Style, textAlign: "center", marginTop: "20px" }}>ALGOHIVE (PTY) LTD</h3>
      <p style={{ textAlign: "center", ...pStyle }}>(Registration Number: 2024/644796/07)</p>
      <p style={{ textAlign: "center", ...pStyle }}>An Authorised Financial Services Provider</p>
      <p style={{ textAlign: "center", ...pStyle }}><strong>FSP NO 55118</strong></p>

      <table style={{ ...infoTableStyle, marginTop: "20px" }}>
        <tbody>
          <tr><td style={infoTdFirstStyle}>Street Address</td><td style={infoTdStyle}>3 Gwen Lane, Sandown, Sandton, 2031</td></tr>
          <tr><td style={infoTdFirstStyle}>Telephone Number</td><td style={infoTdStyle}>+27 (0) 73 781 3375</td></tr>
          <tr><td style={infoTdFirstStyle}>Email Address</td><td style={infoTdStyle}><a href="mailto:info@thealgohive.com">info@thealgohive.com</a></td></tr>
        </tbody>
      </table>

      <p style={{ textAlign: "center", margin: "20px 0" }}>(hereinafter referred to as <strong>ALGOHIVE</strong>)</p>
      <p style={{ textAlign: "center", fontWeight: "bold" }}>and</p>

      <table style={{ ...infoTableStyle, marginTop: "20px" }}>
        <tbody>
          <tr>
            <td style={infoTdFirstStyle}><strong>CLIENT DETAILS:</strong></td>
            <td style={infoTdStyle}>Surname: <input type="text" style={inputStyle} value={lastName} readOnly /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}></td>
            <td style={infoTdStyle}>First Name/s: <input type="text" style={inputStyle} value={firstName} readOnly /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}>ID Number (or Passport Number)</td>
            <td style={infoTdStyle}><input type="text" style={inputStyle} value={idNumber} readOnly /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}><strong>OR</strong></td>
            <td style={infoTdStyle}></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}>Company/Trust Registration Number</td>
            <td style={infoTdStyle}><input type="text" style={inputStyle} readOnly /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}>Postal Address</td>
            <td style={infoTdStyle}><input type="text" style={inputStyle} value={addressDetails.address} readOnly /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}></td>
            <td style={infoTdStyle}>Code: <input type="text" style={{ ...inputStyle, width: "100px" }} value={addressDetails.code} readOnly /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}>Residential Address</td>
            <td style={infoTdStyle}><input type="text" style={inputStyle} value={address} readOnly /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}></td>
            <td style={infoTdStyle}><input type="text" style={inputStyle} readOnly /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}>Tel Number (H)</td>
            <td style={infoTdStyle}>Country Code ( <input type="text" style={smallInputStyle} /> ) Regional Code ( <input type="text" style={smallInputStyle} /> ) <input type="text" style={inputStyle} /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}>Tel Number (W)</td>
            <td style={infoTdStyle}>Country Code ( <input type="text" style={smallInputStyle} /> ) Regional Code ( <input type="text" style={smallInputStyle} /> ) <input type="text" style={inputStyle} /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}>Fax Number (Confidential)</td>
            <td style={infoTdStyle}>Country Code ( <input type="text" style={smallInputStyle} /> ) Regional Code ( <input type="text" style={smallInputStyle} /> ) <input type="text" style={inputStyle} /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}>Fax Number (Other)</td>
            <td style={infoTdStyle}>Country Code ( <input type="text" style={smallInputStyle} /> ) Regional Code ( <input type="text" style={smallInputStyle} /> ) <input type="text" style={inputStyle} /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}>Cell Number</td>
            <td style={infoTdStyle}>Country Code ( <input type="text" style={smallInputStyle} value={phoneDetails.countryCode} readOnly /> ) Cell Code ( <input type="text" style={smallInputStyle} value={phoneDetails.cellCode} readOnly /> ) <input type="text" style={inputStyle} value={phoneDetails.number} readOnly /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}>Email Address (Confidential)</td>
            <td style={infoTdStyle}><input type="text" style={inputStyle} value={email} readOnly /></td>
          </tr>
          <tr>
            <td style={infoTdFirstStyle}>Email Address (Other)</td>
            <td style={infoTdStyle}><input type="text" style={inputStyle} /></td>
          </tr>
        </tbody>
      </table>

      <p style={{ textAlign: "center", marginTop: "20px" }}>(hereinafter referred to as the <strong>Client</strong>)</p>

      <InitialsBox value={initials} onChange={setInitials} isFirst={true} showError={showErrors} />
    </div>
  );

  const renderMainSections = () => (
    <div style={pageStyle}>
      <h3 style={h3Style}>1. INTRODUCTION</h3>

      <p style={pStyle}><span style={sectionNumStyle}>1.1</span> ALGOHIVE warrants that it is the holder of a Category II FSP license number 55118, in accordance with the Financial Advisory and Intermediary Services Act, 2002 (Act No. 37 of 2002), hereafter referred to as FAIS and is authorised to render intermediary services of a discretionary nature in respect of investment products residing under the financial product subcategories indicated in paragraph 1.2 hereunder. The Conditions promulgated in terms of FAIS, provide that a Discretionary Financial Service Provider shall enter into a written mandate with the Client to record the arrangements between the Client and the Financial Service Provider (FSP). The terms and conditions of this written mandate are recorded hereunder.</p>

      <p style={pStyle}><span style={sectionNumStyle}>1.2</span> ALGOHIVE may, in order to render an intermediary service to the Client, utilise the services of its own staff/approved strategists or that of another approved FSP.</p>

      <p style={pStyle}><span style={sectionNumStyle}>1.3</span> ALGOHIVE is authorised to invest in any of the following financial product categories:</p>

      <table style={categoryTableStyle}>
        <thead>
          <tr><th colSpan="2" style={catThStyle}>Category I</th><th style={catThStyle}>Advice and Intermediary Services</th></tr>
        </thead>
        <tbody>
          {[
            ["1.1", "Long term Insurance Sub Category A"],
            ["1.3", "Long term Insurance Sub Category B1"],
            ["1.4", "Long term Insurance Sub Category C"],
            ["1.20", "Long term Insurance Sub Category B2"],
            ["1.5", "Retail Pension Funds"],
            ["1.7", "Pension Fund Benefits"],
            ["1.8", "Shares"],
            ["1.9", "Money Market"],
            ["1.17", "Participatory Interest in a Collective Investment Scheme"],
            ["1.17", "Long-term Deposits"],
            ["1.18", "Short-term Deposits"],
            ["1.20", "Long term Insurance Sub Category B2"],
            ["1.27", "Crypto Assets"],
          ].map(([num, name], i) => (
            <tr key={i}><td style={catTdStyle}>{num}</td><td style={catTdStyle}>{name}</td><td style={{ ...catTdStyle, textAlign: "center" }}>X</td></tr>
          ))}
        </tbody>
      </table>

      <table style={categoryTableStyle}>
        <thead>
          <tr><th colSpan="2" style={catThStyle}>Category II</th><th style={catThStyle}>Intermediary Services</th></tr>
        </thead>
        <tbody>
          {[
            ["2.5", "Shares"],
            ["2.11", "Participatory Interest in a Collective Investment Scheme"],
            ["2.13", "Long term Deposits"],
            ["2.14", "Short term deposits"],
            ["2.21", "Crypto Assets"],
          ].map(([num, name], i) => (
            <tr key={i}><td style={catTdStyle}>{num}</td><td style={catTdStyle}>{name}</td><td style={{ ...catTdStyle, textAlign: "center" }}>X</td></tr>
          ))}
        </tbody>
      </table>

      <p style={pStyle}><span style={sectionNumStyle}>1.4</span> Prior to entering into this Mandate ALGOHIVE obtained from the Client information, with regards to the Client's financial circumstances, needs and objectives and such other information necessary to enable ALGOHIVE to render suitable intermediary services to the Client in terms hereof. Alternatively, ALGOHIVE has ascertained that such information was obtained from the Client's financial advisor and has checked that the advisor is licensed in terms of the FAIS Act.</p>

      <InitialsBox value={initials} onChange={setInitials} showError={showErrors} />

      <h3 style={h3Style}>2. AUTHORISATION</h3>

      <p style={pStyle}><span style={sectionNumStyle}>2.1</span> The Client hereby authorises ALGOHIVE to manage the Client's investments either with full discretion or limited discretion as set out in the schedule that is attached to this Mandate.</p>
      <p style={pStyle}><span style={sectionNumStyle}>2.2</span> This Mandate and attached schedules authorise ALGOHIVE, as the Client's duly authorised agent, to purchase, sell and enter into any transaction on the Client's behalf and in respect of the investments:</p>
      <p style={pStyle}><span style={sectionNumStyle}>2.3</span> ALGOHIVE may implement investment instructions or model portfolios that replicate, or mirror investment strategies selected by the Client from approved strategist models, within the discretion authorised under this mandate.</p>
      <p style={pStyle}><span style={sectionNumStyle}>2.4</span> ALGOHIVE may invest in foreign investments on behalf of the Client.</p>

      <h3 style={h3Style}>3. INVESTMENT OBJECTIVES</h3>

      <p style={pStyle}><span style={sectionNumStyle}>3.1</span> The Client's investment objectives are specified in the schedule that is attached to this Mandate.</p>
      <p style={pStyle}><span style={sectionNumStyle}>3.2</span> The Client's risk profile is determined considering the Client's current set of information and circumstances and the Client acknowledges that these circumstances and information may change over time.</p>
      <p style={pStyle}><span style={sectionNumStyle}>3.3</span> The Client warrants the on-going accuracy and correctness of the Client's investment objectives and any other information that has been provided to ALGOHIVE in order to conclude this Mandate.</p>

      <h3 style={h3Style}>4. RISK DISCLOSURE</h3>

      <p style={pStyle}><span style={sectionNumStyle}>4.1</span> ALGOHIVE uses its discretion to invest on the Client's behalf with great care and diligence. However, the Client acknowledges that there is a risk associated with investing in the financial products involved. The value of the investments and income may rise as well as fall, and there is a risk that the Client may suffer financial losses.</p>
      <p style={pStyle}><span style={sectionNumStyle}>4.2</span> Where the Client selects a strategist model for replication, performance may vary due to timing, execution, liquidity, and cost factors. Past performance of strategist models is not necessarily indicative of future results. ALGOHIVE does not guarantee identical performance or outcomes.</p>
      <p style={pStyle}><span style={sectionNumStyle}>4.3</span> The Client acknowledges that it has been made aware by ALGOHIVE of risks pertaining to the investments which may result in financial loss to it and acknowledges that it accepts such risks and ALGOHIVE or its staff will not be liable or responsible for any financial losses.</p>
      <p style={pStyle}><span style={sectionNumStyle}>4.4</span> The Client hereby irrevocably indemnifies ALGOHIVE and holds it harmless against all and any claims of whatsoever nature that might be made against it howsoever arising from its management of the investments including but not limited to any loss or damage which might be suffered by the Client in consequence of any depreciation in the value of the investments from whatsoever cause arising.</p>

      <InitialsBox value={initials} onChange={setInitials} showError={showErrors} />

      <p style={pStyle}><span style={sectionNumStyle}>4.5</span> When investing in foreign investment products, it is important to be aware of the following risks:</p>

      <p style={indentStyle}><span style={sectionNumStyle}>4.5.1</span> Obtaining access to investment performance information may be more difficult than South African based investments.</p>
      <p style={indentStyle}><span style={sectionNumStyle}>4.5.2</span> Investments are exposed to different tax regimes which may change without warning, and which may influence investment returns.</p>
      <p style={indentStyle}><span style={sectionNumStyle}>4.5.3</span> Exchange control measures may change in the country of investment and it may influence accessibility to the invested capital;</p>
      <p style={indentStyle}><span style={sectionNumStyle}>4.5.4</span> The value of the Rand with respect to the base currencies in which the foreign investment products are invested will fluctuate. The Rand value of such foreign investment products will also fluctuate accordingly.</p>

      <p style={pStyle}><span style={sectionNumStyle}>4.6</span> Subject to its discretionary authorisation, ALGOHIVE may invest in wrap funds or models on behalf of the Client in terms of this Mandate and is thus required by the registrar to make certain disclosures regarding wrap funds and how they differ from funds of funds:</p>

      <p style={indentStyle}><span style={sectionNumStyle}>4.6.1</span> A fund of funds is a collective investment scheme fund that is not allowed to invest more than 50% of the value of the fund in any one collective investment scheme fund. The Collective Investment Scheme Act guarantees the repurchase of participatory interests in a fund of funds by the management company.</p>
      <p style={indentStyle}><span style={sectionNumStyle}>4.6.2</span> A wrap fund or a model is a basket of different collective investment schemes wrapped as a single investment portfolio. The underlying combination of collective investments schemes is selected optimally to target the risk/return requirement and investment objectives of the client. In fact, it is a number of separate investments in which the investor has direct ownership. These underlying investments are selected in line with the investment requirements of the Client. There is no joint ownership among investors and individual ownership of the participatory interests in the collective investment schemes can be transparently demonstrated at all times. A wrap fund investment is administered and facilitated by a linked investment service provider (LISP) i.e. an Administrative FSP. A wrap fund has no limit concerning the collective investment schemes that it may include in its portfolio. The Administrative FSP of the wrap funds does not guarantee the repurchase of participatory interests in the collective investment schemes that comprise the wrap funds. The Administrative FSP has service level agreements in place with the management company of each collective investment scheme according to which the repurchase of participatory interests in collective investment schemes comprising wrap funds are guaranteed. The costs and other information applicable to wrap funds are set out in the documentation of the administrator of the wrap funds.</p>

      <p style={pStyle}><span style={sectionNumStyle}>4.7</span> Any jurisdiction restrictions in respect of the client's portfolio are specified in the schedule that is attached to this Mandate.</p>

      <InitialsBox value={initials} onChange={setInitials} showError={showErrors} />

      <h3 style={h3Style}>5. REGISTRATION OF INVESTMENTS</h3>

      <p style={pStyle}><span style={sectionNumStyle}>5.1</span> All investments managed by ALGOHIVE in terms of this Mandate shall, at ALGOHIVE's election, be registered from time to time in the name of:</p>
      <p style={indentStyle}><span style={sectionNumStyle}>5.1.1</span> The Client, or</p>
      <p style={indentStyle}><span style={sectionNumStyle}>5.1.2</span> A Nominee company as the custodian thereof for the benefit of the Client, or</p>
      <p style={indentStyle}><span style={sectionNumStyle}>5.1.3</span> A Nominee company of a member of the relevant stock or securities exchange, or</p>
      <p style={indentStyle}><span style={sectionNumStyle}>5.1.4</span> In the case of a discretionary LISP, the independent custodian</p>

      <p style={pStyle}><span style={sectionNumStyle}>5.2</span> The Client warrants and undertakes that all investments entrusted and/or delivered by it, or under its authority, to ALGOHIVE in terms of or for the purposes of this Mandate, are not and will not be subject to any lien, charge or other encumbrance or impediment to transfer and that the same shall remain free to any such lien, charge, encumbrance or impediment whilst subject to ALGOHIVE's authority pursuant to this Mandate.</p>

      <h3 style={h3Style}>6. TREATMENT OF FUNDS</h3>

      <p style={pStyle}><span style={sectionNumStyle}>6.1</span> ALGOHIVE shall not receive funds from the Client for the purpose of managing the investments as defined in the Mandate. The Client will deposit the funds directly into the bank account of the investment company or their nominee company (see Annexure A for banking details) where such funds are to be placed for the future management of the investment. Further, ALGOHIVE will not receive any monies whatsoever which are not received through the intermediation of a bank.</p>
      <p style={pStyle}><span style={sectionNumStyle}>6.2</span> Any income, dividends or other distributions generated by the investment will be re-invested in the investment for the Client unless otherwise instructed in the Schedule. If the Client instructs such income, dividends or other distributions to be paid to the Client quarterly or six-monthly, depending on the underlying investments, payment will be effected into the Client's stipulated bank account as they fall due.</p>
      <p style={pStyle}><span style={sectionNumStyle}>6.3</span> In respect of any monies received from an ALGOHIVE client and paid into the ALGOHIVE Client Account, a rate equal to the prevailing banks daily call rate will be accrued and invested for or on behalf of the client as part of their portfolio as soon as the investment on behalf of the client is made. Any other cash portfolio utilized by ALGOHIVE on behalf of a client which earns either interest and/or dividends will be solely for the account of the client after the deduction of the stated fees. Both interest and dividends will be apportioned immediately following accrual and receipt thereof.</p>
      <p style={pStyle}><span style={sectionNumStyle}>6.4</span> No third-party payments will be undertaken by ALGOHIVE on behalf of the Client.</p>

      <h3 style={h3Style}>7. VOTING ON BEHALF OF CLIENTS</h3>

      <p style={pStyle}><span style={sectionNumStyle}>7.1</span> ALGOHIVE may vote on behalf of the Client in respect of a ballot conducted by collective investment scheme in so far as the ballot relates to the investments managed by ALGOHIVE on behalf of the Client.</p>

      <InitialsBox value={initials} onChange={setInitials} showError={showErrors} />

      <h3 style={h3Style}>8. INFORMATION TO BE DISCLOSED BY PRODUCT PROVIDERS</h3>

      <p style={pStyle}><span style={sectionNumStyle}>8.1</span> The Client confirms that ALGOHIVE shall not be required to provide the Client with any information other than that which a product provider, such as a collective investment scheme or other listed insurance company, is required by law to disclose to the Client.</p>

      <h3 style={h3Style}>9. PROHIBITION AGAINST SELLING OR BUYING CERTAIN INVESTMENTS</h3>

      <p style={pStyle}><span style={sectionNumStyle}>9.1</span> ALGOHIVE shall not directly or indirectly:</p>
      <p style={indentStyle}><span style={sectionNumStyle}>9.1.1</span> Sell any financial products owned by ALGOHIVE to the Client</p>
      <p style={indentStyle}><span style={sectionNumStyle}>9.1.2</span> Buy for its own account any investments owned by the Client</p>

      <h3 style={h3Style}>10. DECLARATION REGARDING FUNDS & INVESTMENTS</h3>

      <p style={pStyle}><span style={sectionNumStyle}>10.1</span> The Client warrants, declares and undertakes that all investments entrusted and/or delivered by it, or under its authority, to ALGOHIVE in terms or for the purposes of this Mandate are derived from legitimate sources and do not constitute the "proceeds of unlawful activities" either as defined in the Prevention of Organised Crime Act No. 121 of 1998, as amended, or at all.</p>
      <p style={pStyle}><span style={sectionNumStyle}>10.2</span> The Client further warrants that, where required, all funds entrusted to ALGOHIVE in terms or for the purpose of this Mandate are duly declared in terms of the Income Tax Act of 1962 and that the Client has obtained all necessary approvals from the South African Reserve Bank for foreign funds, assets or investments owned by the Client.</p>

      <h3 style={h3Style}>11. REPORTING</h3>

      <p style={pStyle}><span style={sectionNumStyle}>11.1</span> ALGOHIVE shall furnish the Client with quarterly reports concerning the Client's investments.</p>
      <p style={pStyle}><span style={sectionNumStyle}>11.2</span> ALGOHIVE may furnish the Client with electronic reports provided that the Client can access the reports.</p>
      <p style={pStyle}><span style={sectionNumStyle}>11.3</span> The reports shall contain such information as is reasonably necessary to enable the Client to:</p>
      <p style={indentStyle}><span style={sectionNumStyle}>11.3.1</span> Produce a set of financial statements;</p>
      <p style={indentStyle}><span style={sectionNumStyle}>11.3.2</span> Determine the composition of the financial products comprising the investments and any changes therein over the period to which such report relates;</p>
      <p style={indentStyle}><span style={sectionNumStyle}>11.3.3</span> Determine the market value of such financial products and any changes therein during the period to which such report relates.</p>
      <p style={pStyle}><span style={sectionNumStyle}>11.4</span> ALGOHIVE shall, on request in a comprehensible and timely manner, provide to the Client any reasonable information regarding the investments, market practices and the risks inherent in the different markets and products.</p>
      <p style={pStyle}><span style={sectionNumStyle}>11.5</span> Reports will include details of portfolio holdings, transactions, and where applicable, performance attribution relative to the selected strategist model.</p>

      <InitialsBox value={initials} onChange={setInitials} showError={showErrors} />

      <h3 style={h3Style}>12. REMUNERATION</h3>

      <p style={pStyle}><span style={sectionNumStyle}>12.1</span> In consideration for the management by ALGOHIVE of the investments, the Client shall make payment to ALGOHIVE an annual management fee of 1.00% based on the market value of the portfolio of the Client. Such management fee will be calculated on the market value of the portfolio at the end of each month.</p>
      <p style={pStyle}><span style={sectionNumStyle}>12.2</span> ALGOHIVE may recover the remuneration referred to above at intervals of 1 month from the investment of the Client.</p>
      <p style={pStyle}><span style={sectionNumStyle}>12.3</span> ALGOHIVE will receive no commission / incentives, fee reductions or rebates from a LISP, collective investment scheme for placing the Client's funds with them.</p>
      <p style={pStyle}><span style={sectionNumStyle}>12.4</span> In the event of ALGOHIVE being remunerated by the Life Assurance or Investment Companies, this fact will be disclosed to the Client and the parties may elect to negotiate a different fee structure.</p>
      <p style={pStyle}><span style={sectionNumStyle}>12.5</span> Fees for managing the Client's investments will depend on the type of solution selected:</p>

      <p style={pStyle}><strong>(a) AlgoHive Managed Funds</strong></p>
      <p style={indentStyle}>For investments placed into AlgoHive-managed funds or model portfolios (excluding the OpenStrategies platform), the Client shall pay an annual management fee of 0.99% based on the market value of the portfolio. This fee will be calculated monthly in arrears on the closing market value and deducted directly from the investment account.</p>

      <p style={pStyle}><strong>(b) OpenStrategies Platform</strong></p>
      <p style={indentStyle}>For investments executed via the OpenStrategies mirrored strategy platform, no asset-based management fee will be charged. Instead:</p>
      <p style={indentStyle}>70% of profits realised accrue to the Client,</p>
      <p style={indentStyle}>20–25% of profits are allocated to the selected Strategist, and</p>
      <p style={indentStyle}>5–10% of profits are retained by AlgoHive for platform and oversight services.</p>
      <p style={indentStyle}>These allocations are calculated and settled in accordance with the OpenStrategies participation terms signed by the Client.</p>

      <p style={pStyle}><strong>(c) Transaction Costs</strong></p>
      <p style={indentStyle}>Brokerage and execution fees, including those from Interactive Brokers (IBKR) or any appointed execution broker, are for the Client's account. AlgoHive may earn a margin on these execution costs and pass them through at cost as disclosed by the executing broker.</p>

      <p style={pStyle}><span style={sectionNumStyle}>12.6</span> Fees and performance allocations will be deducted automatically from the investment account and itemised in periodic statements provided to the Client.</p>

      <h3 style={h3Style}>13. DISPUTES</h3>

      <p style={pStyle}><span style={sectionNumStyle}>13.1</span> If any dispute or difference arises as to the validity, interpretation, effect or rights and obligations of either party under this Mandate, either party shall have the right to require that such dispute or difference be referred for a decision to arbitration before a single arbitrator.</p>
      <p style={pStyle}><span style={sectionNumStyle}>13.2</span> The arbitration shall be held in an informal manner in Durban and the identity of the arbitrator shall be mutually agreed upon between the parties within a period of 5 (five) days from the date that the arbitration is called for. The arbitrator shall be an attorney or advocate of 10 (ten) years' standing or more with experience and knowledge of insurance law and with no interest in the proceedings.</p>
      <p style={pStyle}><span style={sectionNumStyle}>13.3</span> The parties agree to keep the arbitration, its subject matter and evidence heard during the arbitration confidential and not to disclose it to any other person.</p>
      <p style={pStyle}><span style={sectionNumStyle}>13.4</span> The decision of the arbitrator shall be final and binding upon the parties and not subject to appeal.</p>

      <InitialsBox value={initials} onChange={setInitials} showError={showErrors} />

      <p style={pStyle}><span style={sectionNumStyle}>13.5</span> The arbitrator shall include in his award an order as to the costs of the arbitration and who shall bear them.</p>
      <p style={pStyle}><span style={sectionNumStyle}>13.6</span> The arbitrator shall at his sole discretion decide on the formulation of the dispute for arbitration but shall at all times be guided by the requirements of the Financial Advisory and Intermediary Services Act 2002 and all applicable ancillary legislation.</p>
      <p style={pStyle}><span style={sectionNumStyle}>13.7</span> The inclusion of this arbitration clause shall not prevent a party from applying to court for urgent relief in the appropriate circumstances.</p>
      <p style={pStyle}><span style={sectionNumStyle}>13.8</span> The parties agree that all the terms of this Mandate are material.</p>

      <h3 style={h3Style}>14. TERMINATION OF MANDATE</h3>

      <p style={pStyle}><span style={sectionNumStyle}>14.1</span> ALGOHIVE or the Client shall be entitled to terminate this Mandate by furnishing, the one to the other, not less than sixty (60) calendar days' written notice of such termination.</p>
      <p style={pStyle}><span style={sectionNumStyle}>14.2</span> ALGOHIVE shall not initiate any market transactions in respect of any investments on behalf of the Client after receipt of notice of termination by the Client of this Mandate unless specifically instructed otherwise by the Client.</p>
      <p style={pStyle}><span style={sectionNumStyle}>14.3</span> Upon receipt from the Client of any such notice of termination of this Mandate, all outstanding fees owing to ALGOHIVE in terms of or arising from the Mandate shall forthwith thereupon be and become due, owing and payable. In this regard the Client irrevocably authorises and empowers ALGOHIVE to deduct such fees either from the cash standing to the credit of the investment's portfolio or from the sale of any securities or financial instruments forming part of the investments if such cash balance is insufficient to enable payment of such fees to be made.</p>
      <p style={pStyle}><span style={sectionNumStyle}>14.4</span> Notwithstanding any other provision in this Mandate, ALGOHIVE's appointment shall immediately cease without prejudice to the rights and obligations of ALGOHIVE and the Client if its status as an authorised financial services provider is finally withdrawn in terms of the FAIS Act or any other provision of applicable legislation.</p>

      <h3 style={h3Style}>15. EFFECTIVE DATE</h3>

      <p style={pStyle}><span style={sectionNumStyle}>15.1</span> This Agreement will become of force and effect on last date of signature.</p>

      <h3 style={h3Style}>16. ADMINISTRATIVE ARRANGEMENTS</h3>

      <p style={pStyle}><span style={sectionNumStyle}>16.1</span> The Client shall apply for the investment products and portfolios on the applicable initial investment application forms.</p>
      <p style={pStyle}><span style={sectionNumStyle}>16.2</span> Any amendment of any provision of this mandate shall be in writing and shall be by means of a supplementary or new agreement between ALGOHIVE and the Client.</p>
      <p style={pStyle}><span style={sectionNumStyle}>16.3</span> ALGOHIVE may make use of the services of its staff and/or that of another authorised financial services provider to execute certain administrative functions in the course of rendering intermediary services to the Client.</p>

      <InitialsBox value={initials} onChange={setInitials} showError={showErrors} />
    </div>
  );

  const renderSchedules = () => (
    <div style={pageStyle}>
      <h2 style={h2Style}>SCHEDULE – FULL DISCRETION</h2>

      <div style={warningBoxStyle}>
        This schedule delegates authority to ALGOHIVE to effect transactions in your name without limitation. If you wish for transactions to be entered into on your behalf to be limited or conditional in any way, this form should not be used. Refer to the limited discretion schedule.
      </div>

      <p style={pStyle}>I hereby authorise ALGOHIVE to manage my investments at its sole and full discretion in order to achieve my investment objectives as indicated below. This means that the Mandate is an unlimited Mandate for ALGOHIVE to exercise its full discretion with regards to the process of managing my investments and ALGOHIVE shall not need to obtain further authority or consent from me to effect any transactions in terms of the Mandate to which this is attached. ALGOHIVE may reinvest in terms of this schedule any amounts that have accrued to me in the form of interests, dividends and the proceeds of disposals.</p>

      <p style={{ ...pStyle, marginTop: "15px" }}>I hereby authorised ALGOHIVE to manage my portfolio in respect of:</p>

      <div style={groupErrorStyle("full_jurisdiction")}>
        {[
          { id: "full-local", label: "Local jurisdictions only" },
          { id: "full-offshore", label: "Off-shore jurisdictions only" },
          { id: "full-both", label: "Both local and off-shore jurisdictions" },
        ].map(({ id, label }) => renderControlledCheckbox(id, label))}
        {showErrors && !isGroupValid("full_jurisdiction") && <p style={{ color: "#ef4444", fontSize: "9px", margin: "2px 0 0 26px" }}>Please select at least one option</p>}
      </div>

      <p style={{ ...pStyle, marginTop: "15px" }}>The Client's investment objectives are specified as follows:</p>

      <p style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "4px" }}>Long Term (5 years or longer)</p>
      <div style={groupErrorStyle("full_long_term")}>
        {["Capital Growth", "Income Generation"].map((l, i) => renderControlledCheckbox(`full-lt-${i}`, l))}
        {showErrors && !isGroupValid("full_long_term") && <p style={{ color: "#ef4444", fontSize: "9px", margin: "2px 0 0 26px" }}>Please select at least one option</p>}
      </div>

      <p style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "4px" }}>Medium Term (2 to 5 years)</p>
      <div style={groupErrorStyle("full_medium_term")}>
        {["Capital Growth", "Income Generation"].map((l, i) => renderControlledCheckbox(`full-mt-${i}`, l))}
        {showErrors && !isGroupValid("full_medium_term") && <p style={{ color: "#ef4444", fontSize: "9px", margin: "2px 0 0 26px" }}>Please select at least one option</p>}
      </div>

      <p style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "4px" }}>Short Term (3 months to 2 years)</p>
      <div style={groupErrorStyle("full_short_term")}>
        {["Capital Growth", "Income Generation"].map((l, i) => renderControlledCheckbox(`full-st-${i}`, l))}
        {showErrors && !isGroupValid("full_short_term") && <p style={{ color: "#ef4444", fontSize: "9px", margin: "2px 0 0 26px" }}>Please select at least one option</p>}
      </div>

      <p style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "4px" }}>Risk Preference*</p>
      <div style={groupErrorStyle("full_risk")}>
        {["Very Conservative", "Conservative", "Moderate", "Aggressive", "Very Aggressive"].map((l, i) => renderControlledCheckbox(`full-rp-${i}`, l))}
        {showErrors && !isGroupValid("full_risk") && <p style={{ color: "#ef4444", fontSize: "9px", margin: "2px 0 0 26px" }}>Please select at least one option</p>}
      </div>

      <InitialsBox value={initials} onChange={setInitials} showError={showErrors} />

      <hr style={{ margin: "30px 0", border: "none", borderTop: "2px solid #ccc" }} />

      <h2 style={h2Style}>SCHEDULE – LIMITED DISCRETION</h2>

      <div style={warningBoxStyle}>
        This schedule delegates limited authority to ALGOHIVE to effect transactions in your name. If you wish for transactions to be entered into on your behalf, not to be limited or conditional in any way, this form should not be used. Refer to the full discretion schedule.
      </div>

      <p style={pStyle}>I hereby restrict ALGOHIVE's discretion in the management on my behalf. ALGOHIVE's right to purchase and sell investments on my behalf may only be exercised by ALGOHIVE:</p>

      <div style={groupErrorStyle("lim_exercise")}>
        {renderControlledCheckbox("lim-instruction", "On my instruction and prior consent")}
        {renderControlledCheckbox("lim-advice", "Upon me receiving advice in respect of such investments from ALGOHIVE, and to which I have consented")}
        <div style={checkboxContainerStyle}>
          <input
            type="checkbox"
            id="lim-advisor"
            checked={!!checkedBoxes["lim-advisor"]}
            onChange={() => toggleCheckbox("lim-advisor")}
            style={checkboxInputStyle}
          />
          <label htmlFor="lim-advisor" style={checkboxLabelStyle}>
            On the instruction of my investment advisor [<input type="text" value="Mint (Pty) Ltd platform (formally known as Algohive)" readOnly style={{ width: "280px", borderBottom: "1px solid #333", border: "none", fontSize: "11px", background: "transparent" }} />], who is a financial services provider licensed in terms of section 8 of the FAIS Act.
          </label>
        </div>
        {showErrors && !isGroupValid("lim_exercise") && <p style={{ color: "#ef4444", fontSize: "9px", margin: "2px 0 0 26px" }}>Please select at least one option</p>}
      </div>

      <p style={{ ...pStyle, marginTop: "15px" }}>I hereby authorised ALGOHIVE to manage my portfolio in respect of:</p>

      <div style={groupErrorStyle("lim_jurisdiction")}>
        {[
          { id: "lim-local", label: "Local jurisdictions only" },
          { id: "lim-offshore", label: "Off-shore jurisdictions only" },
          { id: "lim-both", label: "Both local and off-shore jurisdictions" },
        ].map(({ id, label }) => renderControlledCheckbox(id, label))}
        {showErrors && !isGroupValid("lim_jurisdiction") && <p style={{ color: "#ef4444", fontSize: "9px", margin: "2px 0 0 26px" }}>Please select at least one option</p>}
      </div>

      <p style={{ ...pStyle, marginTop: "15px" }}>Unless instructed otherwise, all cash accruals received in respect of the investments including dividends and interest, shall be:</p>

      <div style={groupErrorStyle("lim_cash")}>
        {[
          { id: "lim-reinvest", label: "Reinvested as and when they fall due and shall form part of the investments" },
          { id: "lim-payout", label: "Paid out to the client into the indicated bank account" },
        ].map(({ id, label }) => renderControlledCheckbox(id, label))}
        {showErrors && !isGroupValid("lim_cash") && <p style={{ color: "#ef4444", fontSize: "9px", margin: "2px 0 0 26px" }}>Please select at least one option</p>}
      </div>

      <p style={{ ...pStyle, marginTop: "15px" }}>My investment objectives are specified as follows:</p>

      <p style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "4px" }}>Long Term (5 years or longer)</p>
      <div style={groupErrorStyle("lim_long_term")}>
        {["Capital Growth", "Income Generation"].map((l, i) => renderControlledCheckbox(`lim-lt-${i}`, l))}
        {showErrors && !isGroupValid("lim_long_term") && <p style={{ color: "#ef4444", fontSize: "9px", margin: "2px 0 0 26px" }}>Please select at least one option</p>}
      </div>

      <p style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "4px" }}>Medium Term (2 to 5 years)</p>
      <div style={groupErrorStyle("lim_medium_term")}>
        {["Capital Growth", "Income Generation"].map((l, i) => renderControlledCheckbox(`lim-mt-${i}`, l))}
        {showErrors && !isGroupValid("lim_medium_term") && <p style={{ color: "#ef4444", fontSize: "9px", margin: "2px 0 0 26px" }}>Please select at least one option</p>}
      </div>

      <p style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "4px" }}>Short Term (3 months to 2 years)</p>
      <div style={groupErrorStyle("lim_short_term")}>
        {["Capital Growth", "Income Generation"].map((l, i) => renderControlledCheckbox(`lim-st-${i}`, l))}
        {showErrors && !isGroupValid("lim_short_term") && <p style={{ color: "#ef4444", fontSize: "9px", margin: "2px 0 0 26px" }}>Please select at least one option</p>}
      </div>

      <p style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "4px" }}>Risk Preference*</p>
      <div style={groupErrorStyle("lim_risk")}>
        {["Very Conservative", "Conservative", "Moderate", "Aggressive", "Very Aggressive"].map((l, i) => renderControlledCheckbox(`lim-rp-${i}`, l))}
        {showErrors && !isGroupValid("lim_risk") && <p style={{ color: "#ef4444", fontSize: "9px", margin: "2px 0 0 26px" }}>Please select at least one option</p>}
      </div>

      <p style={{ marginTop: "15px", fontSize: "10px" }}>* Risk preference is determined considering the current set of information and circumstances of the Client but may change over time.</p>

      <InitialsBox value={initials} onChange={setInitials} showError={showErrors} />

      <hr style={{ margin: "30px 0", border: "none", borderTop: "2px solid #ccc" }} />

      <h2 style={h2Style}>ADDENDUM TO MANDATE</h2>

      <p style={pStyle}>Any amendment of any provision of this mandate shall be in writing and shall be by means of a supplementary or new record of advice between the Provider and the Client.</p>
      <p style={{ ...pStyle, marginTop: "15px" }}>I acknowledge that my current risk profile was determined considering the set of information and circumstances provided at the time of entering into the Mandate and furthermore acknowledge that these circumstances and information have changed over time.</p>
      <p style={{ ...pStyle, marginTop: "15px" }}>By signing this addendum, I hereby notify ALGOHIVE of my change in investment objectives and risk profile.</p>

      <table style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>
        <tbody>
          {[
            { header: "Long Term (5 years or longer)", items: ["Capital Growth", "Income Generation"] },
            { header: "Medium Term (2 to 5 years)", items: ["Capital Growth", "Income Generation"] },
            { header: "Short Term (3 months to 2 years)", items: ["Capital Growth", "Income Generation"] },
            { header: "Risk Preference", items: ["Very Conservative", "Conservative", "Moderate", "Aggressive", "Very Aggressive"] },
          ].map((section, si) => (
            <React.Fragment key={si}>
              <tr style={{ background: "#e0e0e0" }}>
                <td colSpan="2" style={{ padding: "5px", textAlign: "center", fontWeight: "bold", border: "1px solid #333" }}>{section.header}</td>
              </tr>
              {section.items.map((item, ii) => (
                <tr key={ii}>
                  <td style={{ border: "1px solid #333", padding: "5px" }}>{item}</td>
                  <td style={{ border: "1px solid #333", padding: "5px", width: "30px" }}><input type="checkbox" /></td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <InitialsBox value={initials} onChange={setInitials} showError={showErrors} />

      <hr style={{ margin: "30px 0", border: "none", borderTop: "2px solid #ccc" }} />

      <h2 style={h2Style}>Annexure A</h2>
      <h3 style={h3Style}>Bank account details</h3>

      <p style={pStyle}>This account is the ALGOHIVE Client Account. You are required to pay your funds into this account and ALGOHIVE will execute transaction/s to invest these funds in Securities which will constitute your Portfolio in accordance with this Mandate.</p>

      <p style={{ fontWeight: "bold", marginTop: "20px" }}>Local Bank Account</p>

      <table style={{ ...infoTableStyle, marginTop: "15px" }}>
        <tbody>
          <tr><td style={infoTdFirstStyle}>Name of account</td><td style={infoTdStyle}>TBA</td></tr>
          <tr><td style={infoTdFirstStyle}>Bank</td><td style={infoTdStyle}>TBA</td></tr>
          <tr><td style={infoTdFirstStyle}>Type of account</td><td style={infoTdStyle}>Business Current Account</td></tr>
          <tr><td style={infoTdFirstStyle}>Account number</td><td style={infoTdStyle}>000 000 000</td></tr>
          <tr><td style={infoTdFirstStyle}>Branch opened</td><td style={infoTdStyle}>TBA</td></tr>
          <tr><td style={infoTdFirstStyle}>Branch code</td><td style={infoTdStyle}>000000</td></tr>
        </tbody>
      </table>

      <InitialsBox value={initials} onChange={setInitials} showError={showErrors} />
    </div>
  );

  const tabSections = [renderCoverPage, renderMainSections, renderSchedules];

  return (
    <div>
      <div style={{
        display: "flex",
        borderBottom: "2px solid hsl(270 20% 90%)",
        marginBottom: "0",
        background: "hsl(270 30% 97%)",
        borderRadius: "12px 12px 0 0",
        overflow: "hidden",
      }}>
        {TAB_LABELS.map((label, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (activeTab === 2 && !allGroupsValid()) {
                setShowErrors(true);
              }
              setActiveTab(idx);
            }}
            style={{
              flex: 1,
              padding: "12px 8px",
              fontSize: "11px",
              fontWeight: activeTab === idx ? "700" : "500",
              color: activeTab === idx ? "hsl(270 50% 40%)" : "hsl(270 15% 55%)",
              background: activeTab === idx ? "white" : "transparent",
              border: "none",
              borderBottom: activeTab === idx ? "2px solid hsl(270 60% 55%)" : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        style={{
          maxHeight: "60vh",
          overflowY: "auto",
          background: "white",
          borderRadius: "0 0 12px 12px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {tabSections[activeTab]()}
      </div>

      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px",
        padding: "12px 0 4px",
      }}>
        {TAB_LABELS.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (activeTab === 2 && !allGroupsValid()) {
                setShowErrors(true);
              }
              setActiveTab(idx);
            }}
            style={{
              width: activeTab === idx ? "24px" : "8px",
              height: "8px",
              borderRadius: "4px",
              background: activeTab === idx ? "hsl(270 60% 55%)" : "hsl(270 20% 85%)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
              padding: 0,
            }}
            aria-label={`Go to section ${idx + 1}`}
          />
        ))}
      </div>

      <p style={{
        textAlign: "center",
        fontSize: "11px",
        color: "hsl(270 15% 60%)",
        margin: "4px 0 0",
      }}>
        Section {activeTab + 1} of {TAB_LABELS.length}
      </p>
    </div>
  );
};

export default MandateViewer;
