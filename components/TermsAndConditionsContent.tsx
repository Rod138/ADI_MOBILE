import React from "react";
import { Text, StyleSheet } from "react-native";
import LegalModal, {
    LegalSection,
    LegalParagraph,
    LegalBullet,
    LegalSubheading,
    LegalDivider,
} from "./LegalModal";

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function TermsAndConditionsModal({ visible, onClose }: Props) {
    return (
        <LegalModal visible={visible} onClose={onClose} title="Términos y Condiciones">
            <Text style={styles.lastUpdated}>Última actualización: 1 de mayo de 2026</Text>

            <LegalSection title="ACEPTACIÓN DE NUESTROS TÉRMINOS LEGALES" />
            <LegalParagraph>
                Somos X-CORP ("Compañía", "nosotros", "nos", "nuestro"), una empresa registrada en México en Mar Mediterráneo #227, Colonia Popotla, Alcaldía Miguel Hidalgo, C.P. 11400, Ciudad de México, México.
            </LegalParagraph>
            <LegalParagraph>
                Nosotros operamos el sitio web https://adi-web.onrender.com (el "Sitio"), así como cualquier otro producto y servicio relacionado que haga referencia o enlace a estos términos legales (los "Términos legales") (colectivamente, los "Servicios").
            </LegalParagraph>
            <LegalParagraph>
                Puedes contactarnos por correo electrónico en josephd.briseno@yahoo.com o por correo a Mar Mediterráneo #227, Colonia Popotla, Alcaldía Miguel Hidalgo, C.P. 11400, Ciudad de México, México.
            </LegalParagraph>
            <LegalParagraph>
                Estos Términos Legales constituyen un acuerdo legalmente vinculante celebrado entre usted y X-CORP. Al acceder a los Servicios, usted acepta que ha leído, comprendido y se compromete a cumplir con todos estos Términos Legales. SI NO ESTÁ DE ACUERDO CON TODOS ESTOS TÉRMINOS LEGALES, TIENE PROHIBIDO EXPRESAMENTE UTILIZAR LOS SERVICIOS.
            </LegalParagraph>
            <LegalParagraph>
                Los Servicios están destinados a usuarios mayores de 18 años. Las personas menores de 18 años no están autorizadas a utilizar ni a registrarse en los Servicios.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="1. NUESTROS SERVICIOS" />
            <LegalParagraph>
                La información proporcionada al utilizar los Servicios no está destinada a ser distribuida ni utilizada por ninguna persona o entidad en ninguna jurisdicción donde dicha distribución sea contraria a la ley. Quienes decidan acceder a los Servicios desde otras ubicaciones lo hacen por iniciativa propia y son los únicos responsables del cumplimiento de las leyes locales.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="2. DERECHOS DE PROPIEDAD INTELECTUAL" />
            <LegalParagraph>
                Somos los propietarios o licenciatarios de todos los derechos de propiedad intelectual en nuestros Servicios, incluyendo todo el código fuente, bases de datos, funcionalidad, software, diseños de sitios web, audio, video, texto, fotografías y gráficos (colectivamente "Contenido"), así como las marcas comerciales, marcas de servicio y logotipos ("Marcas").
            </LegalParagraph>
            <LegalParagraph>
                Nuestro Contenido y Marcas están protegidos por las leyes de derechos de autor y marcas registradas y tratados alrededor del mundo.
            </LegalParagraph>
            <LegalSubheading>Su uso de nuestros Servicios</LegalSubheading>
            <LegalParagraph>
                Le otorgamos un derecho no exclusivo, intransferible y revocable para acceder a los Servicios y descargar o imprimir una copia de cualquier parte del Contenido, exclusivamente para su uso personal, no comercial o para fines comerciales internos.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="3. REPRESENTACIONES DE LOS USUARIOS" />
            <LegalParagraph>Al utilizar los Servicios, usted declara y garantiza que:</LegalParagraph>
            <LegalBullet>Tiene la capacidad legal y acepta cumplir con estos Términos Legales.</LegalBullet>
            <LegalBullet>No es menor de edad en la jurisdicción en la que reside.</LegalBullet>
            <LegalBullet>No accederá a los Servicios a través de medios automatizados o no humanos.</LegalBullet>
            <LegalBullet>No utilizará los Servicios para ningún fin ilegal o no autorizado.</LegalBullet>
            <LegalBullet>Su uso de los Servicios no violará ninguna ley o reglamento aplicable.</LegalBullet>

            <LegalDivider />

            <LegalSection title="4. ACTIVIDADES PROHIBIDAS" />
            <LegalParagraph>No podrá acceder ni utilizar los Servicios para ningún otro fin que no sea aquel para el que ponemos los Servicios a su disposición. Como usuario, usted acepta no:</LegalParagraph>
            <LegalBullet>Recuperar sistemáticamente datos u otro contenido de los Servicios sin permiso escrito.</LegalBullet>
            <LegalBullet>Engañarnos, estafarnos o inducirnos a error a nosotros y a otros usuarios.</LegalBullet>
            <LegalBullet>Eludir, deshabilitar o interferir con las funciones relacionadas con la seguridad de los Servicios.</LegalBullet>
            <LegalBullet>Utilizar los Servicios de manera incompatible con las leyes o regulaciones aplicables.</LegalBullet>
            <LegalBullet>Cargar o transmitir virus, troyanos u otro material dañino.</LegalBullet>
            <LegalBullet>Intentar suplantar la identidad de otro usuario o persona.</LegalBullet>
            <LegalBullet>Acosar, molestar, intimidar o amenazar a cualquiera de nuestros empleados o agentes.</LegalBullet>
            <LegalBullet>Copiar o adaptar el software de los Servicios.</LegalBullet>
            <LegalBullet>Subir imágenes sobre contenido inapropiado.</LegalBullet>

            <LegalDivider />

            <LegalSection title="5. CONTRIBUCIONES GENERADAS POR EL USUARIO" />
            <LegalParagraph>
                Los Servicios pueden invitarle a chatear, contribuir o participar en otras funcionalidades. Cualquier contribución que transmita puede ser tratada como no confidencial. Al crear o poner a disposición cualquier contribución, usted declara y garantiza que sus contribuciones no infringen ninguna ley o reglamento aplicable.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="6. CONTRIBUCIÓN Y LICENCIA" />
            <LegalParagraph>
                Al publicar sus Contribuciones en cualquier parte de los Servicios, usted nos otorga un derecho mundial, irrevocable, perpetuo, no exclusivo, transferible, libre de regalías y totalmente pagado para usar, copiar, reproducir, distribuir, vender, publicar, transmitir, almacenar, reformatear, traducir, extraer y explotar sus Contribuciones para cualquier propósito.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="7. GESTIÓN DE SERVICIOS" />
            <LegalParagraph>
                Nos reservamos el derecho, pero no la obligación, de supervisar los Servicios para detectar infracciones, emprender acciones legales contra infractores, rechazar o restringir el acceso a contribuciones, y gestionar los Servicios de manera que proteja nuestros derechos y facilite su correcto funcionamiento.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="8. POLÍTICA DE PRIVACIDAD" />
            <LegalParagraph>
                Nos preocupamos por la privacidad y la seguridad de los datos. Al utilizar los Servicios, usted acepta estar sujeto a nuestra Política de Privacidad. Los Servicios están alojados en México.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="9. PLAZO Y TERMINACIÓN" />
            <LegalParagraph>
                Estos Términos Legales permanecerán en pleno vigor y efecto mientras usted utilice los Servicios. NOS RESERVAMOS EL DERECHO, A NUESTRA ENTERA DISCRECIÓN Y SIN PREVIO AVISO, DE NEGAR EL ACCESO A LOS SERVICIOS A CUALQUIER PERSONA POR CUALQUIER MOTIVO.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="10. MODIFICACIONES E INTERRUPCIONES" />
            <LegalParagraph>
                Nos reservamos el derecho de cambiar, modificar o eliminar el contenido de los Servicios en cualquier momento y por cualquier motivo, a nuestra entera discreción y sin previo aviso.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="11. LEY APLICABLE" />
            <LegalParagraph>
                Estos Términos Legales se regirán de acuerdo con las leyes de México. X-CORP y usted consiente que los tribunales de México tendrán jurisdicción exclusiva para resolver cualquier disputa.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="12. RESOLUCIÓN DE DISPUTAS" />
            <LegalSubheading>Negociaciones informales</LegalSubheading>
            <LegalParagraph>
                Las Partes acuerdan intentar primero negociar cualquier Disputa de manera informal durante al menos treinta (30) días antes de iniciar el arbitraje.
            </LegalParagraph>
            <LegalSubheading>Arbitraje vinculante</LegalSubheading>
            <LegalParagraph>
                Cualquier controversia será sometida y resuelta definitivamente por el Tribunal de Arbitraje Comercial Internacional de la Cámara de Arbitraje Europea. La sede del arbitraje será la Ciudad de México, México. El idioma del procedimiento será el español.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="13. CORRECCIONES" />
            <LegalParagraph>
                Nos reservamos el derecho de corregir cualquier error, imprecisión u omisión y de modificar o actualizar la información de los Servicios en cualquier momento y sin previo aviso.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="14. DESCARGO DE RESPONSABILIDAD" />
            <LegalParagraph>
                LOS SERVICIOS SE PROPORCIONAN «TAL CUAL» Y «SEGÚN DISPONIBILIDAD». EN LA MEDIDA MÁXIMA PERMITIDA POR LA LEY, RENUNCIAMOS A TODAS LAS GARANTÍAS, EXPRESAS O IMPLÍCITAS, EN RELACIÓN CON LOS SERVICIOS Y SU USO.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="15. LIMITACIONES DE RESPONSABILIDAD" />
            <LegalParagraph>
                EN NINGÚN CASO NOSOTROS NI NUESTROS DIRECTORES, EMPLEADOS O AGENTES SEREMOS RESPONSABLES ANTE USTED O CUALQUIER TERCERO POR DAÑOS DIRECTOS, INDIRECTOS, CONSECUENTES, EJEMPLARES, INCIDENTALES, ESPECIALES O PUNITIVOS.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="16. INDEMNIZACIÓN" />
            <LegalParagraph>
                Usted acepta defendernos, indemnizarnos y mantenernos indemnes de y contra cualquier pérdida, daño, responsabilidad, reclamo o demanda presentados por cualquier tercero debido a su uso de los Servicios o incumplimiento de estos Términos Legales.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="17. DATOS DEL USUARIO" />
            <LegalParagraph>
                Conservaremos ciertos datos que usted transmita a los Servicios con el fin de gestionar su funcionamiento. Usted es el único responsable de todos los datos que transmita.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="18. COMUNICACIONES ELECTRÓNICAS" />
            <LegalParagraph>
                Visitar los Servicios, enviarnos correos electrónicos y completar formularios en línea constituyen comunicaciones electrónicas. USTED ACEPTA EL USO DE FIRMAS ELECTRÓNICAS, CONTRATOS, PEDIDOS Y OTROS REGISTROS.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="19. VARIOS" />
            <LegalParagraph>
                Estos Términos Legales y cualquier política o regla operativa publicada por nosotros constituyen el acuerdo y entendimiento completo entre usted y nosotros. Podemos ceder cualquiera o todos nuestros derechos y obligaciones a terceros en cualquier momento.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="20. CONTÁCTENOS" />
            <LegalParagraph>
                Para resolver una queja o recibir más información sobre el uso de los Servicios, póngase en contacto con nosotros en:
            </LegalParagraph>
            <LegalParagraph>X-CORP</LegalParagraph>
            <LegalParagraph>Mar Mediterráneo #227, Colonia Popotla, Alcaldía Miguel Hidalgo, C.P. 11400, Ciudad de México, CDMX, México</LegalParagraph>
            <LegalParagraph>josephd.briseno@yahoo.com</LegalParagraph>
        </LegalModal>
    );
}

const styles = StyleSheet.create({
    lastUpdated: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "rgba(255,255,255,0.4)",
        marginBottom: 8,
        fontStyle: "italic",
    },
});
