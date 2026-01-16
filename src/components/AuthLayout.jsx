const AuthLayout = ({ children }) => (
  <div className="relative flex min-h-screen flex-col">
    <div className="blob-bg">
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>
    </div>

    <div className="relative z-20 flex items-center gap-4 px-6 pt-6 animate-on-load delay-1">
      <img
        src="https://aazofjsssobejhkyyiqv.supabase.co/storage/v1/object/public/AlgoHive/ICON%20AHM.svg"
        alt="AlgoMoney logo"
        className="h-4 w-auto drop-shadow-md"
      />
      <h1 className="mint-brand text-xl font-bold tracking-[0.12em]">MINT</h1>
    </div>

    {children}

    <div className="relative z-10 px-6 pb-12">
      <div className="text-center text-xs text-muted-foreground/80 max-w-5xl mx-auto leading-relaxed animate-on-load delay-5">
        <span className="mint-brand">MINT</span> (Pty) Ltd is a Financial Services Provider (FSP 55118) and a
        Registered Credit Provider (NCRCP22892). <span className="mint-brand">MINT</span> Reg no: 2024/644796/07
      </div>
    </div>
  </div>
);

export default AuthLayout;
