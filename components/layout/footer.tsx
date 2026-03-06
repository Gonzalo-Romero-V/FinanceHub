import Link from "next/link"

export function Footer() {
  return (
    <footer className="w-full border-t bg-background py-6">
      <div className="container mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8 px-4 text-center md:text-left">
        {/* Column 1 */}
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-brand-1/80">Desarrollado por</h3>
          <p className="xs text-foreground/50">Gonzalo Romero</p>
          <p className="xs text-foreground/50">ESPOCH - Software Engineering</p>
          <p className="xs text-foreground/50">Riobamba - Ecuador</p>
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-brand-1/80">Contacto</h3>
          <p className="xs text-foreground/50">+593 98 951 9635</p>
          <a href="mailto:gabriel.romero@espoch.edu.ec" className="xs text-foreground/50 hover:underline">gabriel.romero@espoch.edu.ec</a> 

        </div>

        {/* Column 3 */}
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-brand-1/80">Donaciones</h3>
          <Link 
            href="https://patreon.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="xs text-foreground/50 hover:underline"
          >
            Patreon
          </Link>
        </div>


      </div>
    </footer>
  )
}
