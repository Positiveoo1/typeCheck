function Footer({ onNavigate }) {
  return (
    <footer className="site-footer">
      <span>TypeCheck</span>
      <nav aria-label="Legal">
        <button onClick={() => onNavigate('privacy')} type="button">
          Privacy Policy
        </button>
        <button onClick={() => onNavigate('terms')} type="button">
          Terms
        </button>
      </nav>
    </footer>
  );
}

export default Footer;
