import { Scale, Github, Mail } from 'lucide-react'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-brown-900 text-brown-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brown-700">
                <Scale className="w-5 h-5 text-brown-100" strokeWidth={1.8} />
              </div>
              <span className="font-serif text-xl font-bold text-brown-100">LawBrain</span>
            </div>
            <p className="text-sm leading-relaxed text-brown-400 max-w-xs">
              AI-powered legal assistant grounded in the Laws of Zambia. Every answer
              is cited and traceable to official government documents.
            </p>
            <div className="flex items-center gap-4 mt-5">
              <a href="#" aria-label="GitHub" className="text-brown-500 hover:text-brown-200 transition-colors" style={{ textDecoration: 'none' }}>
                <Github className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Contact" className="text-brown-500 hover:text-brown-200 transition-colors" style={{ textDecoration: 'none' }}>
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brown-500 mb-4">
              Legal Resources
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" className="hover:text-brown-100 transition-colors" style={{ textDecoration: 'none' }}>Constitution of Zambia</a></li>
              <li><a href="#" className="hover:text-brown-100 transition-colors" style={{ textDecoration: 'none' }}>Laws of Zambia</a></li>
              <li><a href="#" className="hover:text-brown-100 transition-colors" style={{ textDecoration: 'none' }}>Government Acts</a></li>
              <li><a href="#" className="hover:text-brown-100 transition-colors" style={{ textDecoration: 'none' }}>Statutory Instruments</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brown-500 mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" className="hover:text-brown-100 transition-colors" style={{ textDecoration: 'none' }}>About</a></li>
              <li><a href="#" className="hover:text-brown-100 transition-colors" style={{ textDecoration: 'none' }}>Privacy Policy</a></li>
              <li><a href="#" className="hover:text-brown-100 transition-colors" style={{ textDecoration: 'none' }}>Terms of Service</a></li>
              <li><a href="#" className="hover:text-brown-100 transition-colors" style={{ textDecoration: 'none' }}>Contact</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-brown-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brown-600">
          <p>© {year} LawBrain · Powered by Hytel.io</p>
          <p className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            For informational purposes only — not a substitute for legal advice
          </p>
        </div>
      </div>
    </footer>
  )
}
