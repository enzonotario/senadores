import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-4 md:gap-0 md:justify-between items-center">
        <div className="text-sm text-gray-400 text-center md:text-left">
          Hecho en comunidad gracias a la información de{' '}
          <Link href="https://senado.gob.ar" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">
            senado.gob.ar
          </Link>{' '}
          procesada y mantenida por{' '}
          <Link href="https://argentinadatos.com" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">
            argentinadatos.com
          </Link>
        </div>
        <div className="text-sm">
          <Link
            href="https://github.com/ferminrp/senadores"
            className="text-gray-400 hover:text-blue-300 flex items-center gap-3"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Reportar errores y colaborar</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
          </Link>
        </div>
      </div>
    </footer>
  )
} 