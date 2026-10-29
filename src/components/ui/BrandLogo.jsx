import logo from '../../assets/logo.svg';

const BrandLogo = ({ size = 'desktop', className = '' }) => {
  const compact = size === 'mobile';

  return (
    <span className={`inline-flex shrink-0 items-center gap-2 ${className}`}>
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className={`${compact ? 'h-7 w-7' : 'h-9 w-9'} object-contain transition-transform duration-200 group-hover:scale-105`}
      />
      <span className="inline-flex items-baseline leading-none text-black transition group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-300">
        <span className={`${compact ? 'text-[21px]' : 'text-[30px]'} font-semibold tracking-tight`}>Friet</span>
        <span className={`brand-script ${compact ? 'text-[28px]' : 'text-[39px]'} -ml-0.5`}>sync</span>
      </span>
    </span>
  );
};

export default BrandLogo;
