import React from "react";
import { StyleSheet, Text } from "react-native";
import LegalModal, {
    LegalBullet,
    LegalDivider,
    LegalParagraph,
    LegalSection,
    LegalSubheading,
} from "./LegalModal";

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function PrivacyPolicyModal({ visible, onClose }: Props) {
    return (
        <LegalModal visible={visible} onClose={onClose} title="Política de Privacidad">
            <Text style={styles.lastUpdated}>Última actualización: 1 de mayo de 2026</Text>

            <LegalParagraph>
                Este Aviso de Privacidad para X-CORP describe cómo y por qué podríamos acceder, recopilar, almacenar, usar y/o compartir su información personal cuando utiliza nuestros servicios, incluso cuando usted:
            </LegalParagraph>
            <LegalBullet>Visite nuestro sitio web en https://adi-web.onrender.com o cualquier sitio web nuestro que enlace con este Aviso de Privacidad.</LegalBullet>
            <LegalBullet>Interactúa con nosotros de otras maneras relacionadas, incluyendo cualquier actividad de marketing o eventos.</LegalBullet>
            <LegalParagraph>
                ¿Preguntas o dudas? Si no está de acuerdo con nuestras políticas y prácticas, le imploramos que no utilice nuestros Servicios. Si aún tiene alguna pregunta o inquietud, póngase en contacto con nosotros en josephd.briseno@yahoo.com.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="RESUMEN DE LOS PUNTOS CLAVE" />
            <LegalParagraph>
                ¿Qué información personal utilizamos? Cuando usted visita, utiliza o navega por nuestros servicios, podemos utilizar información personal según cómo interactúe con nosotros y con los servicios, las opciones que elija y los productos y funciones que utilice.
            </LegalParagraph>
            <LegalParagraph>
                ¿Procesamos información personal sensible? No procesamos información personal sensible.
            </LegalParagraph>
            <LegalParagraph>
                ¿Recopilamos información de terceros? No recopilamos información de terceros.
            </LegalParagraph>
            <LegalParagraph>
                ¿Cómo procesamos su información? Procesamos su información para proporcionar, mejorar y administrar nuestros Servicios, comunicarnos con usted, por motivos de seguridad y prevención de fraude, y para cumplir con la ley.
            </LegalParagraph>
            <LegalParagraph>
                ¿Cómo mantenemos su información segura? Contamos con medidas organizativas y procedimientos técnicos para proteger su información personal. Sin embargo, ninguna transmisión electrónica a través de Internet puede garantizarse como 100% segura.
            </LegalParagraph>
            <LegalParagraph>
                ¿Cuáles son sus derechos? Dependiendo de su ubicación geográfica, la ley de privacidad aplicable puede otorgarle ciertos derechos con respecto a su información personal.
            </LegalParagraph>
            <LegalParagraph>
                ¿Cómo ejercer tus derechos? La forma más fácil de ejercer tus derechos es enviando una solicitud de acceso del interesado a los datos o poniéndose en contacto con nosotros.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="1. ¿QUÉ INFORMACIÓN RECOPILAMOS?" />
            <LegalSubheading>Información personal que usted nos revela</LegalSubheading>
            <LegalParagraph>
                Recopilamos información personal que usted nos proporciona voluntariamente cuando expresa interés en obtener información sobre nosotros o nuestros productos y servicios, cuando participa en actividades en los Servicios o cuando se pone en contacto con nosotros.
            </LegalParagraph>
            <LegalParagraph>La información personal que recopilamos puede incluir lo siguiente:</LegalParagraph>
            <LegalBullet>Nombres</LegalBullet>
            <LegalBullet>Números de teléfono</LegalBullet>
            <LegalBullet>Direcciones de correo electrónico</LegalBullet>
            <LegalBullet>Contraseñas</LegalBullet>
            <LegalParagraph>
                Toda la información personal que nos proporcione debe ser veraz, completa y precisa, y debe notificarnos cualquier cambio en dicha información personal.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="2. ¿CÓMO PROCESAMOS SU INFORMACIÓN?" />
            <LegalParagraph>
                Procesamos su información personal por diversas razones, dependiendo de cómo interactúe con nuestros Servicios, entre las que se incluyen:
            </LegalParagraph>
            <LegalBullet>Para enviarle información administrativa sobre nuestros productos, servicios, cambios en nuestros términos y políticas.</LegalBullet>

            <LegalDivider />

            <LegalSection title="3. ¿CUÁNDO Y CON QUIÉN COMPARTIMOS SU INFORMACIÓN PERSONAL?" />
            <LegalParagraph>
                Es posible que necesitemos compartir su información personal en las siguientes situaciones:
            </LegalParagraph>
            <LegalBullet>Transferencias comerciales: Podemos compartir o transferir su información en relación con la venta de activos de la empresa, financiación o adquisición de nuestro negocio por otra empresa.</LegalBullet>

            <LegalDivider />

            <LegalSection title="4. ¿UTILIZAMOS COOKIES Y OTRAS TECNOLOGÍAS DE SEGUIMIENTO?" />
            <LegalParagraph>
                Podemos utilizar cookies y tecnologías de seguimiento similares (como balizas web y píxeles) para recopilar información cuando usted interactúa con nuestros Servicios. También permitimos que terceros y proveedores de servicios utilicen tecnologías de seguimiento en línea en nuestros Servicios para análisis y publicidad.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="5. ¿CUÁNTO TIEMPO CONSERVAMOS SU INFORMACIÓN?" />
            <LegalParagraph>
                Solo conservaremos su información personal durante el tiempo que sea necesario para los fines establecidos en este Aviso de Privacidad. Ningún propósito de este aviso requerirá que conservemos su información personal por más tiempo que 5 años.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="6. ¿CÓMO PROTEGEMOS SU INFORMACIÓN?" />
            <LegalParagraph>
                Hemos implementado medidas técnicas apropiadas y razonables, al igual que medidas organizativas de seguridad diseñadas para proteger la seguridad de cualquier información personal que procesamos. Sin embargo, ninguna transmisión electrónica a través de Internet ni tecnología de almacenamiento puede garantizarse como 100% segura.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="7. ¿RECOPILAMOS INFORMACIÓN DE MENORES?" />
            <LegalParagraph>
                No recopilamos, solicitamos datos ni realizamos actividades de marketing dirigidas a menores de 18 años, ni vendemos a sabiendas dicha información personal. Al utilizar los Servicios, usted declara que tiene al menos 18 años.
            </LegalParagraph>
            <LegalParagraph>
                Si tiene conocimiento de algún dato que podamos haber recopilado de niños menores de 18 años, por favor contáctenos en: josephd.briseno@yahoo.com.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="8. ¿CUÁLES SON SUS DERECHOS DE PRIVACIDAD?" />
            <LegalParagraph>
                Puede revisar, modificar o cancelar su cuenta en cualquier momento, dependiendo de su país, provincia o estado de residencia.
            </LegalParagraph>
            <LegalSubheading>Retirar su consentimiento</LegalSubheading>
            <LegalParagraph>
                Si nos basamos en su consentimiento para procesar su información personal, usted tiene derecho a retirar su consentimiento en cualquier momento poniéndose en contacto con nosotros.
            </LegalParagraph>
            <LegalSubheading>Cookies y tecnologías similares</LegalSubheading>
            <LegalParagraph>
                La mayoría de los navegadores web aceptan cookies por defecto. Si lo prefiere, puede configurar su navegador para eliminar o rechazar las cookies.
            </LegalParagraph>
            <LegalParagraph>
                Si tiene preguntas o comentarios sobre sus derechos de privacidad, puede enviarnos un correo electrónico a josephd.briseno@yahoo.com.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="9. CONTROLES PARA LA FUNCIÓN DE NO SEGUIMIENTO" />
            <LegalParagraph>
                La mayoría de los navegadores web incluyen una opción de No rastrear ("DNT") que puede activar para indicar su preferencia de privacidad. Actualmente no respondemos a las señales DNT del navegador.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="10. ¿ACTUALIZAMOS ESTE AVISO?" />
            <LegalParagraph>
                Podemos actualizar este Aviso de Privacidad de vez en cuando. Si realizamos cambios sustanciales, le notificaremos mediante un aviso destacado o enviándole una notificación directamente. Le recomendamos que revise este Aviso de Privacidad con frecuencia.
            </LegalParagraph>

            <LegalDivider />

            <LegalSection title="11. ¿CÓMO PUEDE CONTACTARNOS EN RELACIÓN CON ESTE AVISO?" />
            <LegalParagraph>
                Si tiene preguntas o comentarios sobre este aviso, puede enviarnos un correo electrónico a josephd.briseno@yahoo.com o contactarnos por correo postal en:
            </LegalParagraph>
            <LegalParagraph>X-CORP</LegalParagraph>
            <LegalParagraph>CDMX, México</LegalParagraph>

            <LegalDivider />

            <LegalSection title="12. ¿CÓMO PUEDE REVISAR, ACTUALIZAR O ELIMINAR SUS DATOS?" />
            <LegalParagraph>
                Según las leyes aplicables de su país, usted tiene derecho a solicitar acceso a la información personal que recopilamos de usted, corregir inexactitudes o eliminar su información personal. También puede tener derecho a retirar su consentimiento para que procesemos su información personal.
            </LegalParagraph>
            <LegalParagraph>
                Para solicitar la revisión, actualización o eliminación de su información personal, por favor rellene y envíe una solicitud de acceso del interesado a los datos.
            </LegalParagraph>

            <LegalParagraph>
                Esta Política de Privacidad se creó utilizando el Generador de Políticas de Privacidad de Termly.
            </LegalParagraph>
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
