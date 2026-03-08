import React from "react";

export interface TechCardProps {
  description: string;
  href: string;
  logo: string;
  name: string;
}

export const TechCard: React.FC<TechCardProps> = ({ description, href, logo, name }) => {
  return (
    <a
      className="flex flex-col bg-white/5 hover:bg-white/8 border border-violet-500/20 hover:border-violet-400/40 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer group h-full hover:shadow-[0_0_15px_rgba(167,139,250,0.15)]"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="flex items-center gap-4 bg-violet-500/10 px-6 py-2 border-b border-violet-500/20">
        <img
          alt={`${name} logo`}
          className="h-10 w-10 object-contain shrink-0 group-hover:scale-110 transition-transform duration-200"
          src={logo}
        />
        <h3 className="text-white text-xl font-bold group-hover:text-violet-100 transition-colors duration-200">
          {name}
        </h3>
      </div>
      <div className="px-6 py-5 flex-1">
        <p className="text-gray-300 text-sm leading-relaxed">{description}</p>
      </div>
    </a>
  );
};
